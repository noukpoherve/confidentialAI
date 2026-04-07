import path from "node:path";
import { spawn } from "node:child_process";
import { SCENARIO_BY_ID, TEST_SCENARIOS, type ScenarioStatus, type TestScenario } from "./test-scenarios";

type RunStatus = "running" | "pass" | "fail";

export interface ScenarioExecutionResult {
  scenarioId: string;
  status: Exclude<ScenarioStatus, "idle">;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  stdout: string;
  stderr: string;
}

export interface TestRunState {
  runId: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  scenarioIds: string[];
  results: Record<string, ScenarioExecutionResult>;
}

interface RunnerState {
  activeRunId: string | null;
  runs: Record<string, TestRunState>;
  latestByScenario: Record<string, ScenarioExecutionResult>;
}

const state: RunnerState = {
  activeRunId: null,
  runs: {},
  latestByScenario: {},
};

function nowIso(): string {
  return new Date().toISOString();
}

function createRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function workspaceRootFromDashboardCwd(): string {
  // apps/admin-dashboard -> repo root
  return path.resolve(process.cwd(), "..", "..");
}

async function executeScenario(scenario: TestScenario): Promise<ScenarioExecutionResult> {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cwd = path.resolve(process.cwd(), scenario.cwd);

  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", scenario.command], {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, scenario.timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeout);
      const finishedAtMs = Date.now();
      const elapsedMs = finishedAtMs - startedAtMs;
      const finalStderr = timedOut
        ? `${stderr}\n[runner] Scenario timed out after ${scenario.timeoutMs}ms`
        : stderr;
      resolve({
        scenarioId: scenario.id,
        status: code === 0 && !timedOut ? "pass" : "fail",
        exitCode: timedOut ? null : code,
        startedAt,
        finishedAt: new Date(finishedAtMs).toISOString(),
        elapsedMs,
        stdout,
        stderr: finalStderr,
      });
    });
  });
}

async function runScenarios(runId: string, scenarioIds: string[]): Promise<void> {
  let hasFailure = false;
  for (const id of scenarioIds) {
    const scenario = SCENARIO_BY_ID.get(id);
    if (!scenario) continue;
    const result = await executeScenario(scenario);
    state.runs[runId].results[id] = result;
    state.latestByScenario[id] = result;
    if (result.status !== "pass") hasFailure = true;
  }

  state.runs[runId].status = hasFailure ? "fail" : "pass";
  state.runs[runId].finishedAt = nowIso();
  if (state.activeRunId === runId) state.activeRunId = null;
}

export function listScenarios() {
  return TEST_SCENARIOS.map((scenario) => ({
    ...scenario,
    latest: state.latestByScenario[scenario.id] || null,
  }));
}

export function getRun(runId: string): TestRunState | null {
  return state.runs[runId] || null;
}

export function getActiveRun(): TestRunState | null {
  if (!state.activeRunId) return null;
  return state.runs[state.activeRunId] || null;
}

export function startRun(inputIds?: string[]): { ok: true; runId: string } | { ok: false; error: string } {
  if (state.activeRunId) {
    return { ok: false, error: "A run is already in progress." };
  }

  const requested = (inputIds && inputIds.length > 0 ? inputIds : TEST_SCENARIOS.map((s) => s.id))
    .filter((id, idx, arr) => arr.indexOf(id) === idx);
  const scenarioIds: string[] = [];
  for (const id of requested) {
    if (!SCENARIO_BY_ID.has(id)) {
      return { ok: false, error: `Unknown scenario: ${id}` };
    }
    scenarioIds.push(id);
  }

  if (scenarioIds.length === 0) {
    return { ok: false, error: "No scenarios selected." };
  }

  const runId = createRunId();
  state.runs[runId] = {
    runId,
    status: "running",
    startedAt: nowIso(),
    finishedAt: null,
    scenarioIds,
    results: {},
  };
  state.activeRunId = runId;

  void runScenarios(runId, scenarioIds);
  return { ok: true, runId };
}

export function getRunnerMeta() {
  return {
    workspaceRoot: workspaceRootFromDashboardCwd(),
    activeRunId: state.activeRunId,
  };
}
