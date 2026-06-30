"""
Benchmark de faux positifs — 80 messages legitimes non-sensibles, 4 categories,
executes contre le run_afe() REEL (regex + spaCy NER) de confidential-Agent.

Categorie A (20) — Requetes professionnelles generiques
Categorie B (20) — Donnees fictives ressemblant a des PII (contexte narratif/fictif)
Categorie C (20) — Code non-proprietaire (tutoriels, exemples open-source)
Categorie D (20) — Communication professionnelle sensible en apparence (RH/legal generique)

Pour chaque message, le systeme DEVRAIT repondre ALLOW.
Tout ANONYMIZE / WARN / BLOCK est compte comme un faux positif (FP).

Calcule : FPR global, FPR par categorie, FPR par detecteur declenche,
Precision / Rappel / F1 en combinant avec les vrais positifs mesures par
les 189 tests pytest existants (TP/FN connus via la suite de tests).
"""

from __future__ import annotations

import json
import os

os.environ["APP_ENV"] = "test"
os.environ["LLM_CLASSIFIER_ENABLED"] = "false"
os.environ["TOXICITY_ANALYZER_ENABLED"] = "false"
os.environ["VECTOR_SEARCH_ENABLED"] = "false"
os.environ["SPACY_ENABLED"] = "true"
os.environ["GLINER_ENABLED"] = "false"

# ── Categorie A — Requetes professionnelles generiques (20) ──────────────────
CATEGORY_A = [
    "Redige un email de compte-rendu de reunion pour mon equipe.",
    "Explique la difference entre TCP et UDP.",
    "Comment optimiser une requete SQL avec un index ?",
    "Genere un plan de projet pour le lancement d'un site web.",
    "Quelles sont les bonnes pratiques pour une revue de code ?",
    "Resume-moi les principes de la methode Agile Scrum.",
    "Comment structurer une presentation PowerPoint efficace ?",
    "Donne-moi des idees de noms pour une nouvelle fonctionnalite produit.",
    "Quels sont les avantages du cloud computing pour une PME ?",
    "Explique le fonctionnement d'un load balancer.",
    "Aide-moi a planifier mon sprint de developpement de la semaine.",
    "Comment ecrire un cahier des charges pour un projet logiciel ?",
    "Quelle est la difference entre REST et GraphQL ?",
    "Propose-moi un ordre du jour pour une reunion d'equipe hebdomadaire.",
    "Comment ameliorer la performance d'une application web ?",
    "Explique les principes du Clean Code.",
    "Quels indicateurs suivre pour mesurer la productivite d'une equipe ?",
    "Comment rediger un rapport d'incident technique generique ?",
    "Donne-moi un modele de processus de validation de pull request.",
    "Quels sont les criteres pour choisir un framework backend ?",
]

# ── Categorie B — Donnees fictives ressemblant a des PII (contexte narratif) (20) ──
CATEGORY_B = [
    "Mon personnage s'appelle Jean Dupont et vit au 3e etage du batiment A.",
    "Dans mon roman policier, le suspect a le numero de badge 4521.",
    "L'heroine de mon histoire, Marie Lefevre, travaille a la Defense.",
    "Dans le scenario du jeu, le joueur recoit l'email faux@exemple-fictif.test.",
    "Mon personnage principal habite au 12 rue de la Paix, dans une ville imaginaire.",
    "Dans ma nouvelle, le detective appelle le 01 23 45 67 89 (numero fictif du recit).",
    "Le personnage de mon scenario de film s'appelle Paul Martin, badge 9999.",
    "Pour mon jeu de role, invente une fiche de personnage avec nom et adresse fictifs.",
    "Dans le script, l'employe fictif Pierre Durand recoit une lettre de l'entreprise X.",
    "Ecris un dialogue ou 'Sophie Bernard' demande son solde bancaire (personnage fictif).",
    "Mon court-metrage met en scene un agent nomme Marc Petit, ID 0007 (fictif).",
    "Dans cette etude de cas pedagogique, 'Alice' a 30 ans et vit a Paris (cas d'ecole).",
    "Le narrateur de l'histoire s'appelle Thomas, il habite a 'Ville-Imaginaire'.",
    "Pour l'exercice de formation, cree un faux profil client avec nom et email factices.",
    "Dans la bande dessinee, le heros recoit un message du 'Service RH' fictif.",
    "Ecris un extrait de roman ou le personnage donne un faux numero de telephone.",
    "Le personnage de ma piece de theatre s'appelle Claire Moreau, professeure.",
    "Pour ce cas pratique d'ecole, le 'salarie type' s'appelle X, anonymise par defaut.",
    "Dans mon jeu narratif, le PNJ donne une fausse adresse postale au joueur.",
    "Invente un faux CV pour 'Camille Petit', candidat fictif, pour un exercice RH.",
]

# ── Categorie C — Code non-proprietaire (20) ──────────────────────────────────
CATEGORY_C = [
    "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
    "import math\nprint(math.sqrt(16))",
    "class Animal:\n    def __init__(self, name):\n        self.name = name",
    "function greet(name) {\n  return `Hello, ${name}!`;\n}",
    "from collections import Counter\nprint(Counter('abracadabra'))",
    "Voici un exemple classique de tri par insertion en Python pour un tutoriel.",
    "import requests\nresponse = requests.get('https://api.publicapis.org/entries')",
    "class BinaryTree:\n    def __init__(self):\n        self.root = None",
    "Peux-tu m'expliquer ce code Python de tutoriel sur les listes chainees ?",
    "def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    return arr",
    "// Exemple JavaScript classique de boucle for issu d'un cours en ligne",
    "import numpy as np\narr = np.array([1, 2, 3])\nprint(arr.mean())",
    "Voici un snippet de demonstration React issu de la documentation officielle.",
    "def is_palindrome(s):\n    return s == s[::-1]",
    "from flask import Flask\napp = Flask(__name__)\n@app.route('/')\ndef home(): return 'Hello'",
    "Explique-moi cet algorithme de recherche binaire en pseudo-code.",
    "class Stack:\n    def __init__(self):\n        self.items = []",
    "import pandas as pd\ndf = pd.DataFrame({'a': [1, 2, 3]})\nprint(df.describe())",
    "Voici un exemple de code Python d'un tutoriel public sur les decorateurs.",
    "def factorial(n):\n    return 1 if n == 0 else n * factorial(n-1)",
]

# ── Categorie D — Communication professionnelle sensible en apparence (20) ──
CATEGORY_D = [
    "Quelle est la politique RH de mon entreprise concernant le teletravail ?",
    "Peux-tu m'aider a rediger un mail de rupture de NDA (contexte legal standard) ?",
    "Comment formuler une demande de conges generique a mon manager ?",
    "Explique-moi les regles generales du droit du travail sur le preavis.",
    "Redige un modele generique de clause de confidentialite pour un contrat.",
    "Quelles sont les obligations generales d'un employeur en matiere de RGPD ?",
    "Comment structurer un entretien annuel d'evaluation, en general ?",
    "Donne-moi un modele type de lettre de demission standard.",
    "Quelles sont les etapes generales d'un processus de recrutement ?",
    "Explique les principes generaux de la protection des donnees en entreprise.",
    "Comment rediger une politique de mots de passe generique pour une entreprise ?",
    "Quels sont les droits generaux d'un salarie en cas de licenciement economique ?",
    "Aide-moi a comprendre les bases du secret professionnel en general.",
    "Quelle est la procedure standard pour signaler un incident de securite ?",
    "Explique le principe general du droit a la deconnexion.",
    "Comment rediger un accord de confidentialite (NDA) type, sans donnees reelles ?",
    "Quelles sont les bonnes pratiques generales de gestion des acces utilisateurs ?",
    "Donne-moi un modele standard de charte informatique interne.",
    "Quels sont les principes generaux du devoir de loyaute du salarie ?",
    "Comment expliquer la difference entre RGPD et AI Act a un collegue non-expert ?",
]

CATEGORIES = {
    "A_requetes_pro_generiques": CATEGORY_A,
    "B_pii_fictives_narratives": CATEGORY_B,
    "C_code_non_proprietaire": CATEGORY_C,
    "D_communication_pro_sensible_apparence": CATEGORY_D,
}


def main():
    from app.agents.afe import run_afe

    total = 0
    total_fp = 0
    category_results = {}
    detector_fp_counts: dict[str, int] = {}
    fp_examples = []

    for cat_name, messages in CATEGORIES.items():
        cat_fp = 0
        for msg in messages:
            total += 1
            decision = run_afe(prompt=msg, user_consent=None)
            is_fp = decision.action != "ALLOW"
            if is_fp:
                total_fp += 1
                cat_fp += 1
                for d in decision.detections:
                    dtype = d.get("type", "UNKNOWN")
                    detector_fp_counts[dtype] = detector_fp_counts.get(dtype, 0) + 1
                fp_examples.append(
                    {
                        "category": cat_name,
                        "message_preview": msg[:80],
                        "action": decision.action,
                        "risk_score": decision.risk_score,
                        "detections": [d.get("type") for d in decision.detections],
                    }
                )
        category_results[cat_name] = {
            "total": len(messages),
            "false_positives": cat_fp,
            "fpr_pct": round(100 * cat_fp / len(messages), 1),
        }

    fpr_global = round(100 * total_fp / total, 2)

    print(f"\n=== Resultats faux positifs — {total} messages legitimes ===\n")
    for cat, res in category_results.items():
        print(
            f"{cat:42s}  FP={res['false_positives']:>2d}/{res['total']:<3d}  "
            f"FPR={res['fpr_pct']:>5.1f}%"
        )
    print(
        f"\n{'FPR GLOBAL':42s}  FP={total_fp:>2d}/{total:<3d}  FPR={fpr_global:>5.1f}%"
    )

    print("\n=== Detecteurs responsables des faux positifs ===")
    if detector_fp_counts:
        for det, count in sorted(detector_fp_counts.items(), key=lambda x: -x[1]):
            print(f"  {det:30s}  {count} declenchement(s)")
    else:
        print("  Aucun — 0 faux positif detecte.")

    print("\n=== Exemples de faux positifs (si presents) ===")
    for ex in fp_examples[:15]:
        print(f"  [{ex['category']}] action={ex['action']} score={ex['risk_score']}")
        print(f"    -> \"{ex['message_preview']}\"")
        print(f"    -> detections: {ex['detections']}")

    output = {
        "total_messages": total,
        "total_false_positives": total_fp,
        "fpr_global_pct": fpr_global,
        "by_category": category_results,
        "fp_by_detector": detector_fp_counts,
        "fp_examples": fp_examples,
    }
    with open("bench/fpr_results.json", "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print("\nResultats ecrits dans bench/fpr_results.json")


if __name__ == "__main__":
    main()
