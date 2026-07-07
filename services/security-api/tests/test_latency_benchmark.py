"""
Latency Benchmark — confidential-Agent DLP (end-to-end, no mocks).

Addresses the MAJEUR-level gap identified in the thesis review report:
"Métriques de latence end-to-end absentes — §4.4.1 reconnaît explicitement"

Methodology:
  - Calls analyze_prompt_with_agents() — the full LangGraph pipeline (AFE →
    VectorSearch → LLMClassifier → AC → ToxicityAnalyzer), NOT the bare
    policy engine. This reflects the real latency experienced by the extension.
  - 5 runs per scenario (reduced from 30 to limit real API call costs).
  - Metrics: min / median / P95 / max (all in milliseconds).
  - LLM paths are triggered when OPENAI_API_KEY is set in the environment
    (auto-detected by settings). Without a key, the LLM classifier is skipped
    and only the deterministic path (AFE + AC) is measured — results will be
    faster and are clearly documented in the report.

Acceptance thresholds:
  - P95 < 5 000 ms  — full E2E including LLM round-trip (≤ 2 500 ms timeout)
  - S4 BLOCK median < 200 ms — strict-block guard fires before any LLM call

Scenarios:
  S1 — ALLOW    : clean prompt, LLM classifier runs (no sensitive content to block).
  S2 — ANONYMIZE: single email, AFE blocks before LLM.
  S3 — WARN     : email + phone, cumulative score triggers WARN without LLM.
  S4 — BLOCK    : API key detected by AFE strict-block guard — LLM never called.
  S5 — SUGGEST_REPHRASE: toxic prompt, reaches ToxicityAnalyzer LLM node.
  S6 — Samsung combined: multi-detector BLOCK — source code + API key + email.
"""

from __future__ import annotations

import os
import statistics
import time
from collections.abc import Callable

from app.agents.orchestrator import analyze_prompt_with_agents

_RUNS = 5
_P95_E2E_LIMIT_MS = 5_000
_MEDIAN_EARLY_EXIT_LIMIT_MS = 200  # strict-block guard fires before any LLM call
_HAS_API_KEY = bool(os.getenv("LLM_CLASSIFIER_API_KEY") or os.getenv("OPENAI_API_KEY"))


# ── Helper ────────────────────────────────────────────────────────────────────


def _run(prompt: str) -> object:
    return analyze_prompt_with_agents(prompt=prompt, user_consent=None)


def _measure(fn: Callable[[], object], runs: int = _RUNS) -> dict[str, float]:
    """Run *fn* `runs` times and return timing statistics in milliseconds."""
    samples: list[float] = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        samples.append((time.perf_counter() - t0) * 1_000)

    sorted_samples = sorted(samples)
    p95_idx = max(0, int(len(sorted_samples) * 0.95) - 1)
    return {
        "min_ms": sorted_samples[0],
        "median_ms": statistics.median(samples),
        "p95_ms": sorted_samples[p95_idx],
        "max_ms": sorted_samples[-1],
        "runs": runs,
    }


# ── S1 — ALLOW (clean prompt, LLM classifier active) ─────────────────────────


def test_latency_s1_allow() -> None:
    """
    S1: Clean prompt — AFE finds nothing, vector search misses, LLM classifier
    runs (if API key present), AC confirms ALLOW. Slowest path.
    """
    prompt = "Can you explain how zero-trust architecture works in a cloud environment?"
    stats = _measure(lambda: _run(prompt))

    assert (
        stats["p95_ms"] < _P95_E2E_LIMIT_MS
    ), f"S1 ALLOW P95 {stats['p95_ms']:.1f} ms exceeds {_P95_E2E_LIMIT_MS} ms"
    _print_scenario(
        "S1 — ALLOW (clean, LLM active)" + ("" if _HAS_API_KEY else " [no key]"), stats
    )


# ── S2 — ANONYMIZE (single email, AFE blocks before LLM) ─────────────────────


def test_latency_s2_anonymize() -> None:
    """S2: Email detected by AFE regex — score 15, action ANONYMIZE. LLM skipped."""
    prompt = "Please contact me at alice@example.com for the project details."
    stats = _measure(lambda: _run(prompt))

    assert stats["p95_ms"] < _P95_E2E_LIMIT_MS
    _print_scenario("S2 — ANONYMIZE (email, regex only)", stats)


# ── S3 — WARN (medium-risk PII combination) ──────────────────────────────────


def test_latency_s3_warn() -> None:
    """S3: Email + phone cumulative score → WARN. LLM skipped once score ≥ 40."""
    prompt = "Call me at +33 6 12 34 56 78 or email alice@corp.com for details."
    stats = _measure(lambda: _run(prompt))

    assert stats["p95_ms"] < _P95_E2E_LIMIT_MS
    _print_scenario("S3 — WARN (email + phone, regex only)", stats)


# ── S4 — BLOCK (API key, strict-block early exit) ────────────────────────────


def test_latency_s4_block() -> None:
    """
    S4: API key hits the strict-block guard in AFE — BLOCK decided before
    any LLM call or vector search. Fastest path regardless of API key.
    """
    prompt = "Debug this key: sk_liveABCDEFGHIJKLMNOP12345 in production."
    stats = _measure(lambda: _run(prompt))

    result = analyze_prompt_with_agents(prompt=prompt, user_consent=None)
    assert result.decision.action == "BLOCK"
    assert stats["p95_ms"] < _P95_E2E_LIMIT_MS
    assert stats["median_ms"] < _MEDIAN_EARLY_EXIT_LIMIT_MS, (
        f"S4 BLOCK median {stats['median_ms']:.1f} ms — early-exit should be "
        f"< {_MEDIAN_EARLY_EXIT_LIMIT_MS} ms (LLM never reached)"
    )
    _print_scenario("S4 — BLOCK (API key, early-exit, no LLM)", stats)


# ── S5 — SUGGEST_REPHRASE (toxic language, ToxicityAnalyzer LLM call) ────────


def test_latency_s5_suggest_rephrase() -> None:
    """
    S5: Toxic language — pipeline reaches ToxicityAnalyzer which calls the LLM
    to generate 3 rephrase alternatives. Most latency-intensive path after S1.
    """
    prompt = "That fucking feature is broken again, fix it immediately."
    stats = _measure(lambda: _run(prompt))

    assert stats["p95_ms"] < _P95_E2E_LIMIT_MS
    _print_scenario(
        "S5 — SUGGEST_REPHRASE (toxic, ToxicityAnalyzer LLM)"
        + ("" if _HAS_API_KEY else " [no key]"),
        stats,
    )


# ── S6 — Samsung combined scenario (multi-detector BLOCK) ────────────────────


def test_latency_s6_samsung_combined() -> None:
    """
    S6: Source code + API key + internal URL + email — AFE strict-block guard
    fires immediately on API key. BLOCK before any LLM call.
    """
    prompt = (
        "import os\n"
        "SECRET = 'sk_liveABCDEFGHIJ1234567'\n"
        "HOST = 'https://db.internal/prod'\n"
        "Contact: security@corp.example.com\n"
    )
    stats = _measure(lambda: _run(prompt))

    result = analyze_prompt_with_agents(prompt=prompt, user_consent=None)
    assert result.decision.action == "BLOCK"
    assert stats["p95_ms"] < _P95_E2E_LIMIT_MS
    _print_scenario("S6 — BLOCK (Samsung combined, multi-detector)", stats)


# ── Aggregate report ──────────────────────────────────────────────────────────


def test_print_latency_report() -> None:
    """
    Print Tab 4.Y — Latency benchmark summary for thesis Chapter 4.
    Run with: pytest -s tests/test_latency_benchmark.py::test_print_latency_report

    LLM paths are measured with real API calls when OPENAI_API_KEY is set.
    The [LLM] marker indicates scenarios that reach an LLM node.
    """
    scenarios = [
        (
            "S1 — ALLOW (clean)          [LLM]",
            "Can you explain how zero-trust architecture works?",
        ),
        (
            "S2 — ANONYMIZE (email)            ",
            "Please contact alice@example.com for the project.",
        ),
        (
            "S3 — WARN (email + phone)         ",
            "Call +33 6 12 34 56 78 or email alice@corp.com.",
        ),
        (
            "S4 — BLOCK (API key, early-exit)  ",
            "Debug this key: sk_liveABCDEFGHIJKLMNOP12345",
        ),
        ("S5 — SUGGEST_REPHRASE (toxic)[LLM]", "That fucking feature is broken again."),
        (
            "S6 — BLOCK (Samsung combined)     ",
            "import os\nSECRET = 'sk_liveABCDEFGHIJ1234567'\nHOST = 'https://db.internal/prod'\nContact: security@corp.example.com",
        ),
    ]

    llm_status = (
        "ENABLED (real API calls)"
        if _HAS_API_KEY
        else "DISABLED (no API key — LLM path skipped)"
    )

    print("\n")
    print(
        "╔═══════════════════════════════════════════════════════════════════════════════╗"
    )
    print(
        f"║  LATENCY BENCHMARK — confidential-Agent DLP ({_RUNS} runs / scenario)               ║"
    )
    print(f"║  LLM Classifier: {llm_status:<58}║")
    print(
        "╠══════════════════════════════════════════╦══════════╦══════════╦══════════╦══╣"
    )
    print(
        "║  Scenario                                ║  min ms  ║  med ms  ║  P95 ms  ║ok║"
    )
    print(
        "╠══════════════════════════════════════════╬══════════╬══════════╬══════════╬══╣"
    )

    for label, prompt in scenarios:
        stats = _measure(lambda p=prompt: _run(p))
        ok = "✓" if stats["p95_ms"] < _P95_E2E_LIMIT_MS else "✗"
        print(
            f"║  {label:<40}║ {stats['min_ms']:>8.1f} ║ {stats['median_ms']:>8.1f} "
            f"║ {stats['p95_ms']:>8.1f} ║{ok} ║"
        )

    print(
        "╠══════════════════════════════════════════╩══════════╩══════════╩══════════╩══╣"
    )
    print(
        f"║  Acceptance: P95 < {_P95_E2E_LIMIT_MS} ms (E2E)  ·  S4 early-exit median < {_MEDIAN_EARLY_EXIT_LIMIT_MS} ms          ║"
    )
    print(
        "╚═══════════════════════════════════════════════════════════════════════════════╝"
    )
    assert True


# ── Internal helper ───────────────────────────────────────────────────────────


def _print_scenario(label: str, stats: dict) -> None:
    print(
        f"\n  [{label}] "
        f"min={stats['min_ms']:.1f}ms  "
        f"median={stats['median_ms']:.1f}ms  "
        f"P95={stats['p95_ms']:.1f}ms  "
        f"max={stats['max_ms']:.1f}ms  "
        f"(n={stats['runs']})"
    )
