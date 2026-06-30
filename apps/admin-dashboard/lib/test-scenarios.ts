export type TestLayer = "backend" | "frontend" | "e2e" | "benchmark";

export type ScenarioStatus = "idle" | "running" | "pass" | "fail";

export interface TestScenario {
  id: string;
  title: string;
  description: string;
  layer: TestLayer;
  tags: string[];
  command: string;
  cwd: string;
  timeoutMs: number;
}

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "be-policy-engine",
    title: "Backend · Policy engine",
    description: "Core allow/anonymize/warn/block decisions and AVS thresholds.",
    layer: "backend",
    tags: ["policy", "security"],
    command: "uv run python -m pytest tests/test_policy_engine.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "be-detectors",
    title: "Backend · Detectors",
    description: "Regex/spaCy detectors for PII, toxicity, URLs, and false positives.",
    layer: "backend",
    tags: ["detectors", "toxicity", "pii"],
    command: "uv run python -m pytest tests/test_detectors_enhanced.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "be-orchestrator",
    title: "Backend · LangGraph orchestrator",
    description: "Node ordering, skip-paths, and final decision assembly.",
    layer: "backend",
    tags: ["langgraph", "orchestrator"],
    command: "uv run python -m pytest tests/test_langgraph_orchestrator.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "be-api-incidents",
    title: "Backend · API incidents",
    description: "Analyze/validate-response incident persistence and retrieval.",
    layer: "backend",
    tags: ["api", "incidents"],
    command: "uv run python -m pytest tests/test_api_incidents.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "be-toxicity",
    title: "Backend · Toxicity analyzer",
    description: "Rephrase suggestions, fallback logic, and action transitions.",
    layer: "backend",
    tags: ["toxicity", "rephrase"],
    command: "uv run python -m pytest tests/test_toxicity_analyzer.py tests/test_workflow_guardrails.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "be-auth-settings",
    title: "Backend · Auth and settings",
    description: "Signup/login/profile and user settings sync contract.",
    layer: "backend",
    tags: ["auth", "settings"],
    command: "uv run python -m pytest tests/test_auth_settings_api.py -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "fe-extension-unit",
    title: "Frontend · Extension unit tests",
    description: "DOM and utility tests for extension behavior.",
    layer: "frontend",
    tags: ["extension", "vitest"],
    command: "npm run test",
    cwd: "../browser-extension",
    timeoutMs: 120000,
  },
  {
    id: "e2e-test-runner-ui",
    title: "E2E · Dashboard test runner UI",
    description: "Visual workflow for run-all and per-scenario execution.",
    layer: "e2e",
    tags: ["dashboard", "playwright"],
    command: "npm run test:e2e",
    cwd: ".",
    timeoutMs: 180000,
  },
  {
    id: "bench-false-positive",
    title: "Benchmark · False Positive Rate",
    description: "FPR ≤ 15%, Hard-FPR ≤ 5%, F1 ≥ 0.90 — 80 legitimate + 10 sensitive messages.",
    layer: "benchmark",
    tags: ["fpr", "f1", "precision", "recall"],
    command: "uv run python -m pytest tests/test_false_positive_benchmark.py -v -s -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "bench-fpr-no-llm",
    title: "Benchmark · FPR sans LLM (AFE regex+NER)",
    description: "Taux de faux positifs couche AFE pure — 80 messages légitimes, 20 sensibles. Precision / Rappel / F1 sans LLM classifier.",
    layer: "benchmark",
    tags: ["fpr", "f1", "precision", "recall", "afe", "no-llm"],
    command: "uv run python bench/bench_fpr_combined.py",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "bench-fpr-with-llm",
    title: "Benchmark · FPR avec LLM (pipeline complet)",
    description: "Taux de faux positifs pipeline complet (AFE + LLM classifier + ToxicityAnalyzer). Nécessite OPENAI_API_KEY.",
    layer: "benchmark",
    tags: ["fpr", "f1", "precision", "recall", "llm", "full-pipeline"],
    command: "uv run python -m pytest tests/test_false_positive_benchmark.py::test_print_benchmark_report tests/test_false_positive_benchmark.py::test_false_positive_rate_below_threshold tests/test_false_positive_benchmark.py::test_f1_score_above_threshold -v -s",
    cwd: "../../services/security-api",
    timeoutMs: 300000,
  },
  {
    id: "bench-latency",
    title: "Benchmark · End-to-end Latency",
    description: "P95 < 3 000 ms, regex-only median < 200 ms — 6 scenarios × 30 runs.",
    layer: "benchmark",
    tags: ["latency", "p95", "performance"],
    command: "uv run python -m pytest tests/test_latency_benchmark.py -v -s -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
  {
    id: "bench-dlp-comparison",
    title: "Benchmark · DLP Comparison",
    description: "confidential-Agent vs Purview / Nightfall / Metomic — ≥ 3 scénarios exclusifs.",
    layer: "benchmark",
    tags: ["purview", "nightfall", "metomic", "comparison"],
    command: "uv run python -m pytest tests/test_dlp_comparison.py -v -s -q",
    cwd: "../../services/security-api",
    timeoutMs: 120000,
  },
];

export const SCENARIO_BY_ID = new Map(TEST_SCENARIOS.map((s) => [s.id, s]));
