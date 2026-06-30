# Matrice de couverture des tests — OWASP LLM Top 10 v2025

> Répond à la lacune CRITIQUE identifiée dans le rapport d'analyse :  
> "Couverture tests non documentée par rapport aux vecteurs de sécurité LLM"  
>
> **Référentiel** : [OWASP Top 10 for Large Language Model Applications — 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)  
> **Périmètre** : 21 fichiers de tests, services/security-api/tests/

---

## 1. Référentiel OWASP LLM Top 10 v2025

| ID      | Vecteur | Description (résumé) |
|---------|---------|----------------------|
| LLM01   | Prompt Injection | Manipulation des instructions LLM via le contenu utilisateur |
| LLM02   | Sensitive Information Disclosure | Fuite de données personnelles ou confidentielles par le LLM |
| LLM03   | Supply Chain | Compromission des dépendances modèles, datasets, plugins |
| LLM04   | Data and Model Poisoning | Empoisonnement des données d'entraînement ou fine-tuning |
| LLM05   | Improper Output Handling | Traitement insuffisant des sorties LLM (XSS, injection, contenu toxique) |
| LLM06   | Excessive Agency | Délégation excessive d'autorité aux agents LLM |
| LLM07   | System Prompt Leakage | Exfiltration du prompt système via manipulation utilisateur |
| LLM08   | Vector and Embedding Weaknesses | Attaques sur les bases vectorielles (empoisonnement, extraction) |
| LLM09   | Misinformation | Génération de désinformation ou contenu trompeur |
| LLM10   | Unbounded Consumption | Utilisation non contrôlée des ressources (tokens, coûts, CPU) |

---

## 2. Matrice fichiers de tests × vecteurs OWASP

| # | Fichier de test | LLM01 | LLM02 | LLM03 | LLM04 | LLM05 | LLM06 | LLM07 | LLM08 | LLM09 | LLM10 |
|---|-----------------|-------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| 1  | `test_policy_engine.py` | ✓ | ✓ | | | ✓ | | | | | |
| 2  | `test_regression_guards.py` | ✓ | ✓ | | | | | | | | |
| 3  | `test_false_positive_benchmark.py` | ✓ | ✓ | | | ✓ | | | | | |
| 4  | `test_latency_benchmark.py` | | | | | | | | | | ✓ |
| 5  | `test_dlp_comparison.py` | ✓ | ✓ | | | ✓ | | | | | |
| 6  | `test_workflow_guardrails.py` | ✓ | ✓ | | | ✓ | ✓ | | | | |
| 7  | `test_toxicity_analyzer.py` | | ✓ | | | ✓ | | | | ✓ | |
| 8  | `test_llm_classifier.py` | ✓ | ✓ | | | | | | | | |
| 9  | `test_langgraph_orchestrator.py` | ✓ | ✓ | | | ✓ | ✓ | | | | |
| 10 | `test_detectors_enhanced.py` | | ✓ | | | ✓ | | | | | |
| 11 | `test_spacy_unit.py` | | ✓ | | | | | | | | |
| 12 | `test_vector_search.py` | | | | | | | | ✓ | | |
| 13 | `test_image_moderator_enhanced.py` | | | | | ✓ | | | | ✓ | |
| 14 | `test_asi_unit.py` | | ✓ | | | | ✓ | | | | |
| 15 | `test_auth_core_unit.py` | | ✓ | | | | | | | | |
| 16 | `test_auth_settings_api.py` | | ✓ | | | | | | | | |
| 17 | `test_api_incidents.py` | | ✓ | | | | | | | | |
| 18 | `test_stores_unit.py` | | ✓ | | | | | | | | ✓ |
| 19 | `test_site_signals_api.py` | | ✓ | | | | | | | | ✓ |
| 20 | `test_error_tracking.py` | | ✓ | | | | | | | | |
| 21 | `test_health_and_api_infra.py` | | | | | | | | | | ✓ |
| **Total fichiers** | | **8** | **17** | **0** | **0** | **8** | **3** | **0** | **1** | **3** | **5** |

---

## 3. Détail par vecteur OWASP

### LLM01 — Prompt Injection (8 fichiers)

Ce vecteur est le plus haut risque pour un DLP pré-soumission. confidential-Agent le mitige via un détecteur dédié (`PROMPT_INJECTION`, poids 70 → BLOCK immédiat) et via l'envoi du prompt **anonymisé** au LLM classifier.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_policy_engine.py` | `test_block_prompt_injection_in_response`, `test_block_disregard_injection_variant` |
| `test_regression_guards.py` | `test_no_fp_on_common_words` (négatif : mots courants non bloqués) |
| `test_false_positive_benchmark.py` | Catégorie D : messages légitimes à haute sensibilité apparente |
| `test_dlp_comparison.py` | `test_confidential_agent_uniquely_catches_injection` |
| `test_workflow_guardrails.py` | Intégration : injection + données sensibles → décision finale correcte |
| `test_llm_classifier.py` | Classification sémantique du contexte d'injection |
| `test_langgraph_orchestrator.py` | Chemin complet AFE → LLMClassifier → AC |
| `test_detectors_enhanced.py` | PROMPT_INJECTION regex : `IGNORE PREVIOUS INSTRUCTIONS`, variantes FR |

---

### LLM02 — Sensitive Information Disclosure (17 fichiers)

Vecteur principal de confidential-Agent : détecter et bloquer toute fuite de PII, secrets ou données confidentielles avant qu'elles n'atteignent une plateforme IA.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_policy_engine.py` | `test_block_api_key`, `test_anonymize_iban`, `test_warn_email_phone` |
| `test_regression_guards.py` | `test_api_key_in_prompt_is_always_blocked`, `test_password_in_prompt_is_always_blocked` |
| `test_false_positive_benchmark.py` | FPR ≤ 15%, Hard-FPR (BLOCK) ≤ 5%, F1 ≥ 0.90 |
| `test_dlp_comparison.py` | `test_confidential_agent_uniquely_catches_hr_legal_french`, `test_confidential_agent_uniquely_catches_internal_url` |
| `test_workflow_guardrails.py` | Décision enforced (WARN/ANONYMIZE) même en présence de toxicité |
| `test_toxicity_analyzer.py` | Détection TOXIC_LANGUAGE sans faux-positifs sur contenu professionnel |
| `test_llm_classifier.py` | PII_COMBINATION, contexte confidentiel (RH, juridique, stratégie) |
| `test_langgraph_orchestrator.py` | `anonymized_prompt` vérifié : LLM reçoit PII masqués |
| `test_detectors_enhanced.py` | HARMFUL_URL, TOXIC_LANGUAGE (EN + FR) |
| `test_spacy_unit.py` | NER : PERSON, ORG, LOC (entités nommées françaises) |
| `test_asi_unit.py` | Alertes RSSI : fragments PII anonymisés dans la notification |
| `test_auth_core_unit.py` | JWT : token non exposé, vérification expiration |
| `test_auth_settings_api.py` | Routes auth protégées, credentials non retournés en clair |
| `test_api_incidents.py` | Audit trail : incidents avec `graphTrace`, timestamp, `anonymized_prompt` |
| `test_stores_unit.py` | Fail-open : incidents persistés in-memory si MongoDB indisponible |
| `test_site_signals_api.py` | Signaux d'échec DLP par site : `hostname`, `eventType`, sans PII brut |
| `test_error_tracking.py` | Sentry : headers `Authorization`, `api_key` → `[FILTERED]` avant envoi |

---

### LLM03 — Supply Chain (0 fichier — hors périmètre partiel)

| Aspect | Statut |
|--------|--------|
| Dépendances Python (`uv.lock`, `pyproject.toml`) | Vérifiées par `uv lock --check` en CI, pas de tests unitaires dédiés |
| Modèles LLM tiers (GPT-4.1-mini) | Fournisseur unique (OpenAI) — risque accepté, non adressable côté client |
| Extension Chrome (NPM, manifest) | Audité par `npm audit` en CI |
| **Décision de périmètre** | Un DLP client ne peut pas valider l'intégrité de la chaîne d'approvisionnement des LLMs qu'il filtre. Ce vecteur est hors périmètre technique de confidential-Agent par construction. |

---

### LLM04 — Data and Model Poisoning (0 fichier — hors périmètre)

| Décision de périmètre | Justification |
|-----------------------|---------------|
| Aucun test | confidential-Agent n'entraîne aucun modèle. GPT-4.1-mini est utilisé en inférence uniquement. L'empoisonnement du modèle sous-jacent est une responsabilité d'OpenAI, hors périmètre d'un DLP client. |

---

### LLM05 — Improper Output Handling (8 fichiers)

confidential-Agent valide les **réponses** des LLMs via le pipeline `ResponseGraphState` (AVS → LLMClassifier → AC → ToxicityAnalyzer) avant de les afficher à l'utilisateur.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_policy_engine.py` | `test_analyze_response_*`, `test_analyze_avs_response_*` : réponses IA bloquées si PII reproduits |
| `test_false_positive_benchmark.py` | FPR pipeline réponse : contenu légitime non bloqué |
| `test_dlp_comparison.py` | Scénario H (réponse contenant données bancaires) |
| `test_workflow_guardrails.py` | Pipeline réponse complet : BLOCK si secret reproduit |
| `test_toxicity_analyzer.py` | `test_suggest_rephrase_on_toxic_*` : reformulations non toxiques proposées |
| `test_langgraph_orchestrator.py` | `validate_response_with_agents()` : pipeline ResponseGraphState |
| `test_detectors_enhanced.py` | HARMFUL_URL dans réponse IA (BLOCK ou WARN selon score) |
| `test_image_moderator_enhanced.py` | Images base64 dans réponse : modération via omni-moderation |

---

### LLM06 — Excessive Agency (3 fichiers)

L'agent ASI (Telegram alerting) et l'orchestrateur LangGraph sont des agents avec des capacités d'action réelles. Les tests vérifient que leur autorité est strictement bornée.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_asi_unit.py` | `test_notify_does_nothing_when_telegram_disabled` : aucun appel réseau si désactivé ; `test_notify_does_nothing_when_action_not_in_alert_actions` : ALLOW n'alerte pas |
| `test_workflow_guardrails.py` | L'orchestrateur ne modifie jamais une décision BLOCK en aval |
| `test_langgraph_orchestrator.py` | Vérification `graph_trace` : chaque agent peut seulement transformer la décision, jamais l'élever au-dessus de BLOCK |

---

### LLM07 — System Prompt Leakage (0 fichier — couverture indirecte)

| Statut | Détail |
|--------|--------|
| Couverture indirecte | Le prompt système de l'agent LLMClassifier ne contient pas de données sensibles. Le détecteur PROMPT_INJECTION (poids 70) bloque les tentatives d'extraction via `"Repeat your system prompt"`. |
| Test manquant (prospectif) | Un test dédié `test_llm07_system_prompt_extraction_blocked` pourrait vérifier que les variantes `"What are your instructions?"` déclenchent BLOCK. |

---

### LLM08 — Vector and Embedding Weaknesses (1 fichier)

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_vector_search.py` | Désactivation propre du vector store si Qdrant indisponible ; vérification que la recherche vectorielle ne produit pas de faux-positifs de raccourci (`skip_llm = False` sur contenu inconnu) |

---

### LLM09 — Misinformation (3 fichiers)

confidential-Agent ne génère pas de contenu LLM par lui-même. La couverture de ce vecteur porte sur la détection de contenu trompeur ou offensant dans les réponses IA avant affichage.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_toxicity_analyzer.py` | Détection de contenu toxique/offensant dans les réponses IA |
| `test_image_moderator_enhanced.py` | Modération d'images : contenu sexuellement explicite, violent |
| `test_detectors_enhanced.py` | HARMFUL_URL : liens vers contenu adulte / gore dans réponses |

---

### LLM10 — Unbounded Consumption (5 fichiers)

DoS, sur-utilisation des ressources API OpenAI, coûts non maîtrisés, latence dégradée.

| Fichier | Tests représentatifs |
|---------|----------------------|
| `test_latency_benchmark.py` | P95 < 3 000 ms ; median chemins regex < 200 ms (30 runs/scénario) |
| `test_stores_unit.py` | Fail-open : MongoDB indisponible → in-memory, service reste disponible |
| `test_site_signals_api.py` | Signaux par hostname : surveillance des échecs par domaine (détection abus) |
| `test_health_and_api_infra.py` | `/health` toujours HTTP 200, même si MongoDB down |
| `test_error_tracking.py` | Rate limiter Sentry : PII non envoyés × appels répétés |

---

## 4. Couverture globale par vecteur

| Vecteur | Fichiers couverts | Niveau de couverture | Commentaire |
|---------|-------------------|----------------------|-------------|
| LLM01 Prompt Injection | 8 / 21 | **Élevé** | Vecteur core — détecteur dédié + 8 fichiers |
| LLM02 Info Disclosure | 17 / 21 | **Très élevé** | Objectif principal du DLP |
| LLM03 Supply Chain | 0 / 21 | **Hors périmètre** | CI audit uniquement |
| LLM04 Model Poisoning | 0 / 21 | **Hors périmètre** | Inférence only, aucun fine-tuning |
| LLM05 Output Handling | 8 / 21 | **Élevé** | Pipeline réponse + toxicité |
| LLM06 Excessive Agency | 3 / 21 | **Moyen** | ASI + orchestrateur bornés |
| LLM07 Prompt Leakage | 0 / 21 | **Indirect** | Couvert par LLM01, gap prospectif identifié |
| LLM08 Vector Weaknesses | 1 / 21 | **Faible** | Vector store optionnel, couverture minimale |
| LLM09 Misinformation | 3 / 21 | **Moyen** | Toxicité + images + HARMFUL_URL |
| LLM10 Consumption | 5 / 21 | **Élevé** | Benchmark latence + fail-open + rate limit |

---

## 5. Vecteurs hors périmètre — justification formelle

Les vecteurs LLM03 et LLM04 sont **structurellement hors périmètre** de confidential-Agent :

> **confidential-Agent est un DLP client** : il intercepte les flux *entre* l'utilisateur et les plateformes IA. Il ne contrôle ni les modèles utilisés, ni leurs données d'entraînement, ni la chaîne d'approvisionnement des fournisseurs LLM.

Cette délimitation est conforme aux recommandations OWASP : un contrôle de sécurité ne peut être évalué que sur les risques qu'il est architecturalement en position de mitiger.

**Vecteur résiduel hors périmètre identifié dans la thèse** (STRIDE section R) : les brèches côté infrastructure LLM (ex. : ChatGPT/Redis 2023, indexation Google 2025) ne sont pas adressables par un DLP client. La solution prospective documentée est le chiffrement homomorphe (FHE) ou l'usage de LLMs locaux (Ollama).

---

## 6. Tests d'acceptation — résumé exécutif

```
pytest services/security-api/tests/ -v --tb=short

Résultats attendus :
  21 fichiers, ~180 tests collectés
  0 FAILED (critère de livraison)

Tests d'acceptation académique (threshold-based) :
  test_false_positive_benchmark.py::test_false_positive_rate_below_threshold  → FPR ≤ 15%
  test_false_positive_benchmark.py::test_false_positive_rate_below_threshold  → Hard-FPR ≤ 5%
  test_false_positive_benchmark.py::test_f1_score_above_threshold             → F1 ≥ 0.90
  test_latency_benchmark.py::test_latency_s*                                  → P95 < 3 000 ms
  test_dlp_comparison.py::test_unique_advantages_count                        → ≥ 3 scénarios uniques
```
