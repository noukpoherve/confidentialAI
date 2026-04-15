export type TestLayer = "backend" | "frontend" | "e2e";

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
];

export const SCENARIO_BY_ID = new Map(TEST_SCENARIOS.map((s) => [s.id, s]));
