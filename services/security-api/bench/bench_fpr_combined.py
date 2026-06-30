"""
Benchmark FPR combine — AFE (regex + spaCy NER) uniquement, sans LLM.

Lance successivement :
  1. bench_false_positives.py  — FPR global et par categorie (80 messages legitimes)
  2. bench_precision_recall.py — Matrice de confusion, Precision / Rappel / F1

Les variables d'environnement forcent la desactivation du LLM, du vecteur
search et de GLiNER afin d'isoler la couche deterministe pure.
"""

from __future__ import annotations

import importlib.util
import os

os.environ["APP_ENV"] = "test"
os.environ["LLM_CLASSIFIER_ENABLED"] = "false"
os.environ["TOXICITY_ANALYZER_ENABLED"] = "false"
os.environ["VECTOR_SEARCH_ENABLED"] = "false"
os.environ["SPACY_ENABLED"] = "true"
os.environ["GLINER_ENABLED"] = "false"

BENCH_DIR = os.path.dirname(__file__)


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(
        name, os.path.join(BENCH_DIR, filename)
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


if __name__ == "__main__":
    print("=" * 70)
    print("  BENCHMARK FPR — COUCHE AFE (regex + spaCy NER) — SANS LLM")
    print("=" * 70)

    print("\n[1/2] Faux positifs sur 80 messages legitimes\n")
    fp_mod = _load("bench_fp", "bench_false_positives.py")
    fp_mod.main()

    print("\n[2/2] Precision / Rappel / F1 (20 messages sensibles + 80 legitimes)\n")
    pr_mod = _load("bench_pr", "bench_precision_recall.py")
    pr_mod.main()

    print("\n" + "=" * 70)
    print(
        "  Resultats JSON : bench/fpr_results.json  |  bench/precision_recall_f1.json"
    )
    print("=" * 70)
