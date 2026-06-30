# Pseudo-codes algorithmiques formels — confidential-Agent

> Répond à la lacune MINEUR identifiée dans le rapport d'analyse :  
> "Pseudo-code absent pour les algorithmes clés" et  
> "Mécanisme SUGGEST_REPHRASE insuffisamment formalisé"  
>
> **Référence code** : `services/security-api/app/core/policy_engine.py`,  
> `services/security-api/app/agents/toxicity_analyzer.py`,  
> `services/security-api/app/agents/orchestrator.py`

---

## Algorithme 3.1 — Scoring asymétrique AFE (Agent de Filtrage d'Entrée)

```
ALGORITHME 3.1 — Scoring asymétrique AFE
─────────────────────────────────────────────────────────────────────────────

ENTRÉE :
  message       : str         — texte brut (prompt utilisateur ou réponse IA)
  type_pipeline : Enum        — { PROMPT | RESPONSE | AVS_RESPONSE }
  user_consent  : bool | None — consentement explicite de l'utilisateur (prompts uniquement)

SORTIE :
  PolicyDecision {
    action      : Enum { ALLOW | ANONYMIZE | WARN | BLOCK | SUGGEST_REPHRASE }
    risk_score  : int ∈ [0, 100]
    reasons     : list[str]
    detections  : list[{ type, valuePreview, confidence }]
    redactions  : list[{ original, replacement, span }]
    created_at  : ISO-8601 timestamp
    suggestions : list[str]  — présent seulement si action == SUGGEST_REPHRASE
  }

─────────────────────────────────────────────────────────────────────────────

DÉBUT
  score    ← 0
  reasons  ← []
  detections ← []
  redactions ← []

  // ── Étape 1 : Détection déterministe (regex) ──────────────────────────
  hits ← detect_sensitive_content(message)    // voir detectors.py

  // ── Étape 2 : Scoring asymétrique ────────────────────────────────────
  POUR chaque hit DANS hits FAIRE
    base_weight ← RISK_WEIGHTS[hit.type]      // défini dans policy_engine.py

    SI type_pipeline == RESPONSE ALORS
      multiplier ← RESPONSE_RISK_MULTIPLIERS.get(hit.type, 1.0)
    SINON
      multiplier ← 1.0
    FIN SI

    // AVS_RESPONSE : seules les catégories morales contribuent au score
    SI type_pipeline == AVS_RESPONSE ET hit.type ∉ { TOXIC_LANGUAGE, HARMFUL_URL } ALORS
      CONTINUER   // ignorer les PII dans le pipeline de réponse morale
    FIN SI

    score ← score + ENTIER(base_weight × multiplier)
    detections.append({ type: hit.type, valuePreview: hit.raw_value[:24], confidence: hit.confidence })
  FIN POUR

  score ← MIN(score, 100)   // plafond absolu

  // ── Étape 3 : Décision d'action ───────────────────────────────────────
  unique_types ← { hit.type POUR hit DANS hits }

  // Garde inconditionnel : secrets dans les prompts → BLOCK immédiat
  SI type_pipeline == PROMPT ET
     enable_strict_block_on_secret == VRAI ET
     { API_KEY, PASSWORD, TOKEN } ∩ unique_types ≠ ∅ ALORS
    action  ← BLOCK
    reasons ← ["Critical secret detected."]

  // Secrets dans les réponses → BLOCK inconditionnel
  SINON SI type_pipeline ∈ { RESPONSE, AVS_RESPONSE } ET
           { API_KEY, PASSWORD, TOKEN } ∩ unique_types ≠ ∅ ALORS
    action  ← BLOCK
    reasons ← ["Model reproduced a critical secret — response blocked."]

  // Seuils quantitatifs (PROMPT)
  SINON SI type_pipeline == PROMPT ALORS
    SI score ≥ 70 ALORS
      action ← BLOCK ;  reasons ← ["High risk score."]
    SINON SI score ≥ 40 ALORS
      SI user_consent == VRAI ALORS
        action ← ANONYMIZE ; reasons ← ["Medium risk with explicit user consent."]
      SINON
        action ← WARN ;      reasons ← ["Medium risk requires warning."]
      FIN SI
    SINON SI score ≥ 15 ALORS
      action ← ANONYMIZE ; reasons ← ["Low-to-medium risk requires anonymization."]
    SINON
      action ← ALLOW ;    reasons ← ["No significant risk detected."]
    FIN SI

  // Seuils quantitatifs (RESPONSE / AVS_RESPONSE)
  SINON
    SI score ≥ 60 ALORS
      action ← BLOCK ;    reasons ← ["High-risk content in model response."]
    SINON SI score ≥ 20 ALORS
      action ← WARN ;     reasons ← ["Sensitive content in model response."]
    SINON SI score ≥ 10 ALORS
      action ← ANONYMIZE; reasons ← ["Potentially sensitive content."]
    SINON
      action ← ALLOW ;    reasons ← ["No significant risk detected."]
    FIN SI
  FIN SI

  // ── Étape 4 : Redactions ─────────────────────────────────────────────
  SI action ∈ { ANONYMIZE, WARN, BLOCK } ALORS
    redactions ← build_redactions(hits)   // remplace chaque hit par [REDACTED_TYPE]
  FIN SI

  // ── Étape 5 : Construction et retour ─────────────────────────────────
  RETOURNER PolicyDecision(
    action     = action,
    risk_score = score,
    reasons    = reasons,
    detections = detections,
    redactions = redactions,
    created_at = NOW_ISO8601(),
    suggestions = []
  )

FIN
```

**Complexité** : O(D × M) où D = nombre de détecteurs (11) et M = longueur du message.  
**Référence implémentation** : `policy_engine.py:analyze_prompt()`, `analyze_response()`, `analyze_avs_response()`

---

## Algorithme 3.2 — SUGGEST_REPHRASE (ToxicityAnalyzer)

```
ALGORITHME 3.2 — SUGGEST_REPHRASE (ToxicityAnalyzer LangGraph node)
─────────────────────────────────────────────────────────────────────────────

ENTRÉE :
  text     : str            — texte original (prompt brut, pas anonymisé)
  decision : PolicyDecision — décision issue des agents précédents (AFE + LLM + AC)

SORTIE :
  PolicyDecision (mise à jour) {
    action      : Enum — peut passer de ALLOW → SUGGEST_REPHRASE
    suggestions : list[str] — exactement 3 reformulations ou []
    detections  : list enrichie (TOXIC_LANGUAGE ajouté si détecté)
    risk_score  : int — majoré si SUGGEST_REPHRASE
  }

PRÉCONDITIONS :
  - settings.toxicity_analyzer_enabled == VRAI
  - decision.action ≠ BLOCK  (les décisions BLOCK ne sont jamais modifiées)

─────────────────────────────────────────────────────────────────────────────

DÉBUT
  // Garde : désactivé ou BLOCK absolu
  SI settings.toxicity_analyzer_enabled == FAUX ALORS
    RETOURNER decision (inchangée)
  FIN SI

  SI decision.action == BLOCK ALORS
    RETOURNER decision (inchangée)
    // BLOCK est absolu ; proposer des reformulations serait contradictoire
  FIN SI

  // ── Étape 1 : Appel LLM (GPT-4.1-mini) ───────────────────────────────
  texte_tronqué ← text[:1500]  // limite coût et latence

  prompt_system ← """
    Tu es un modérateur de contenu bienveillant.
    Analyse le texte pour : profanité, insultes, agressivité, harcèlement,
    langage sexuellement offensant, menaces (EN + FR).
    Si toxicité détectée, fournis EXACTEMENT 3 reformulations qui :
    1. Préservent l'intention communicationnelle
    2. Éliminent tout contenu offensant
    3. Restent dans la même langue
    Réponds UNIQUEMENT en JSON : { "is_toxic": bool, "severity": "low"|"medium"|"high",
    "confidence": float, "categories": [...], "reason": str, "suggestions": [str, str, str] }
  """

  résultat_llm ← GPT-4.1-mini.complete(
    system    = prompt_system,
    user      = texte_tronqué,
    max_tokens = 800,
    temperature = 0,
    response_format = json_object
  )

  // ── Étape 2 : Gestion fail-open ───────────────────────────────────────
  SI résultat_llm == NULL OU erreur HTTP ALORS
    // LLM indisponible : vérifier si la toxicité a déjà été détectée en amont
    SI TOXIC_LANGUAGE ∈ { d.type POUR d DANS decision.detections } ALORS
      // Générer des suggestions de repli par remplacement déterministe
      suggestions ← _fallback_suggestions(text)
      new_action  ← SUGGEST_REPHRASE SI decision.action == ALLOW SINON decision.action
      RETOURNER PolicyDecision(action=new_action, suggestions=suggestions, ...)
    SINON
      RETOURNER decision (inchangée)
    FIN SI
  FIN SI

  // ── Étape 3 : Traitement du résultat ─────────────────────────────────
  SI résultat_llm.is_toxic == FAUX ALORS
    RETOURNER decision (inchangée)   // pas de toxicité → aucune modification
  FIN SI

  severity   ← résultat_llm.severity           // "low" | "medium" | "high"
  confidence ← résultat_llm.confidence
  categories ← résultat_llm.categories
  reason     ← résultat_llm.reason
  suggestions ← résultat_llm.suggestions[:3]   // max 3 reformulations

  // ── Étape 4 : Calcul du score toxicité ───────────────────────────────
  severity_score ← { "low": 15, "medium": 30, "high": 55 }[severity]

  // ── Étape 5 : Règles d'action asymétriques ────────────────────────────
  //
  // ALLOW + toxicité → SUGGEST_REPHRASE
  //   Philosophie : ne pas bloquer la communication mais proposer une alternative
  //   respectueuse. L'utilisateur CHOISIT librement parmi les 3 reformulations.
  //
  // WARN ou ANONYMIZE + toxicité → action MAINTENUE + suggestions ajoutées
  //   La décision de sécurité (PII détecté) prime sur la suggestion de reformulation.
  //   Les suggestions aident l'utilisateur mais n'annulent pas le filtrage DLP.
  //
  // BLOCK → jamais modifié (gardé en Étape 1)

  SI decision.action == ALLOW ALORS
    new_action     ← SUGGEST_REPHRASE
    new_risk_score ← MAX(decision.risk_score, severity_score)
  SINON
    new_action     ← decision.action   // WARN ou ANONYMIZE conservés
    new_risk_score ← decision.risk_score
  FIN SI

  // ── Étape 6 : Enrichissement des détections ───────────────────────────
  new_detections ← decision.detections + [{
    type         : "TOXIC_LANGUAGE",
    valuePreview : JOIN(categories[:3], ", ") OU severity.upper(),
    confidence   : ROUND(confidence, 3)
  }]

  new_reasons ← decision.reasons + [
    f"[Toxicity] {severity} severity ({JOIN(categories)}): {reason}"
  ]

  // ── Étape 7 : Retour ─────────────────────────────────────────────────
  RETOURNER PolicyDecision(
    action      = new_action,
    risk_score  = new_risk_score,
    reasons     = new_reasons,
    detections  = new_detections,
    redactions  = decision.redactions,
    created_at  = decision.created_at,
    suggestions = suggestions
  )
  // Note : les suggestions sont affichées à l'utilisateur dans l'UI de l'extension.
  // Le choix est laissé à l'utilisateur — aucun blocage automatique (principe
  // de communication non-violente appliqué au DLP).

FIN
```

**Complexité** : O(1) appels LLM + O(K) pour K = nb de suggestions (≤ 3)  
**Latence typique** : 800 ms – 2 500 ms (latence API OpenAI dominante) ; < 200 ms si LLM mocked  
**Référence implémentation** : `toxicity_analyzer.py:run_toxicity_analyzer()`

---

## Algorithme 3.3 — Orchestration LangGraph (pipeline prompt complet)

```
ALGORITHME 3.3 — Pipeline prompt multi-agents (LangGraph StateGraph)
─────────────────────────────────────────────────────────────────────────────

ENTRÉE :
  prompt       : str
  user_consent : bool | None
  user_id      : str | None

SORTIE :
  AgentExecution { decision: PolicyDecision, graph_trace: list[str] }

─────────────────────────────────────────────────────────────────────────────

DÉBUT
  state ← PromptGraphState { prompt, user_consent, user_id, visited: [] }

  // ── Nœud 1 : AFE (local, sans appel API) ─────────────────────────────
  decision ← run_afe(prompt, user_consent, user_id)      // Algorithme 3.1
  anonymized_prompt ← apply_redactions(prompt, decision.redactions)
  state.visited.append("afe")
  state.decision ← decision
  state.anonymized_prompt ← anonymized_prompt

  // ── Nœud 2 : Vector Search (raccourci sémantique) ────────────────────
  decision, skip_llm ← run_prompt_vector_search(prompt, decision)
  state.visited.append("vector_search")
  state.skip_llm_classifier ← skip_llm

  // ── Routage conditionnel 1 : skip LLM si BLOCK ou vecteur similaire ──
  SI skip_llm OU decision.action == BLOCK ALORS
    ALLER À nœud_ac
  SINON
    ALLER À nœud_llm
  FIN SI

  // ── Nœud 3 : LLM Classifier (sémantique, reçoit anonymized_prompt) ───
  nœud_llm:
    text_for_llm ← state.anonymized_prompt OU prompt
    decision ← run_llm_classifier(text_for_llm, decision)
    state.visited.append("llm_classifier")

  // ── Nœud 4 : AC (Arbitration Controller) ─────────────────────────────
  nœud_ac:
    decision ← run_ac(decision)
    state.visited.append("ac")

  // ── Routage conditionnel 2 : skip toxicité si BLOCK ──────────────────
  SI settings.toxicity_analyzer_enabled == FAUX OU decision.action == BLOCK ALORS
    ALLER À fin
  SINON
    ALLER À nœud_toxicity
  FIN SI

  // ── Nœud 5 : ToxicityAnalyzer ─────────────────────────────────────────
  nœud_toxicity:
    decision ← run_toxicity_analyzer(prompt, decision)   // Algorithme 3.2
    state.visited.append("toxicity_analyzer")

  // ── Fin ───────────────────────────────────────────────────────────────
  fin:
    RETOURNER AgentExecution(
      decision    = state.decision,
      graph_trace = state.visited
    )

FIN
```

**Propriété de sécurité clé** : le LLM classifier reçoit TOUJOURS le prompt anonymisé (`anonymized_prompt`), jamais le PII brut. L'AFE est exécuté en premier, garantissant l'anonymisation avant tout appel réseau.

**graphTrace** : la liste `visited` constitue le `graphTrace` de l'AI Act article 13 — elle documente chaque agent ayant participé à la décision finale, permettant une auditabilité complète.
