"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StatusTone = "idle" | "running" | "pass" | "fail";

interface ScenarioLatest {
  status: Exclude<StatusTone, "idle">;
  elapsedMs: number;
  finishedAt: string;
  stdout: string;
  stderr: string;
}

interface ScenarioRow {
  id: string;
  title: string;
  description: string;
  layer: "backend" | "frontend" | "e2e";
  tags: string[];
  latest: ScenarioLatest | null;
}

interface RunState {
  runId: string;
  status: "running" | "pass" | "fail";
  scenarioIds: string[];
  results: Record<
    string,
    {
      status: Exclude<StatusTone, "idle">;
      elapsedMs: number;
      stdout: string;
      stderr: string;
      finishedAt: string;
    }
  >;
}

interface RunnerPayload {
  scenarios: ScenarioRow[];
  activeRun: RunState | null;
}

function toneClass(status: StatusTone): string {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "fail") return "border-rose-200 bg-rose-50 text-rose-800";
  if (status === "running") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-line bg-canvas text-ink-muted";
}

function prettyMs(ms: number): string {
  if (!Number.isFinite(ms)) return "-";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function TestRunnerClient() {
  const [payload, setPayload] = useState<RunnerPayload>({ scenarios: [], activeRun: null });
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    const res = await fetch("/api/test-runner/scenarios", { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load test runner state (${res.status})`);
    }
    const data = (await res.json()) as RunnerPayload;
    setPayload(data);
  }, []);

  const runScenarios = useCallback(async (scenarioIds?: string[]) => {
    setActionError(null);
    const res = await fetch("/api/test-runner/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioIds: scenarioIds && scenarioIds.length > 0 ? scenarioIds : undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Failed to start run.");
    }
    await loadState();
  }, [loadState]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadState();
      } catch (error) {
        if (!cancelled) {
          setActionError(error instanceof Error ? error.message : "Failed to load runner.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadState]);

  useEffect(() => {
    if (!payload.activeRun || payload.activeRun.status !== "running") return;
    const id = setInterval(() => {
      loadState().catch(() => {
        // Keep last known state; transient failures shouldn't erase UI.
      });
    }, 1300);
    return () => clearInterval(id);
  }, [payload.activeRun, loadState]);

  const statusCounts = useMemo(() => {
    const counts = { pass: 0, fail: 0, running: 0, idle: 0 };
    for (const scenario of payload.scenarios) {
      const active = payload.activeRun?.results[scenario.id];
      const status = (active?.status || scenario.latest?.status || "idle") as StatusTone;
      counts[status] += 1;
    }
    return counts;
  }, [payload.scenarios, payload.activeRun]);

  if (loading) {
    return <div className="rounded-2xl border border-line bg-canvas p-6 text-sm text-ink-muted">Loading test runner…</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-ink">Test Runner</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Run backend, frontend, and E2E scenarios from one visual dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={payload.activeRun?.status === "running"}
            onClick={() => {
              runScenarios().catch((error) => {
                setActionError(error instanceof Error ? error.message : "Run failed.");
              });
            }}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-canvas disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run all scenarios
          </button>
          <button
            type="button"
            disabled={!selectedScenario || payload.activeRun?.status === "running"}
            onClick={() => {
              if (!selectedScenario) return;
              runScenarios([selectedScenario]).catch((error) => {
                setActionError(error instanceof Error ? error.message : "Run failed.");
              });
            }}
            className="rounded-xl border border-line bg-canvas px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run selected
          </button>
        </div>
      </div>

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">PASS</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{statusCounts.pass}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">FAIL</p>
          <p className="mt-1 text-2xl font-bold text-rose-900">{statusCounts.fail}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">RUNNING</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{statusCounts.running}</p>
        </div>
        <div className="rounded-xl border border-line bg-canvas px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">IDLE</p>
          <p className="mt-1 text-2xl font-bold text-ink">{statusCounts.idle}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Scenario</th>
              <th className="px-4 py-3">Layer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payload.scenarios.map((scenario) => {
              const activeResult = payload.activeRun?.results[scenario.id];
              const status = (activeResult?.status || scenario.latest?.status || "idle") as StatusTone;
              const elapsedMs = activeResult?.elapsedMs ?? scenario.latest?.elapsedMs ?? 0;
              const logs = activeResult || scenario.latest;
              const selected = selectedScenario === scenario.id;
              return (
                <tr key={scenario.id} className="border-b border-line/80 align-top">
                  <td className="px-4 py-3">
                    <label className="flex cursor-pointer items-start gap-2">
                      <input
                        type="radio"
                        name="selected-scenario"
                        checked={selected}
                        onChange={() => setSelectedScenario(scenario.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block font-semibold text-ink">{scenario.title}</span>
                        <span className="mt-0.5 block text-xs text-ink-muted">{scenario.description}</span>
                        <span className="mt-1 block text-[11px] text-ink-muted/80">{scenario.tags.join(" · ")}</span>
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-line bg-surface px-2 py-1 text-xs font-semibold uppercase">
                      {scenario.layer}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold uppercase ${toneClass(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{prettyMs(elapsedMs)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={payload.activeRun?.status === "running"}
                        onClick={() => {
                          runScenarios([scenario.id]).catch((error) => {
                            setActionError(error instanceof Error ? error.message : "Run failed.");
                          });
                        }}
                        className="rounded-lg border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Run
                      </button>
                      <details>
                        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">View logs</summary>
                        <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-line bg-slate-950 p-2 font-mono text-[11px] text-slate-100">
                          <p className="text-slate-300">stdout</p>
                          <pre className="whitespace-pre-wrap">{logs?.stdout || "-"}</pre>
                          <p className="mt-2 text-slate-300">stderr</p>
                          <pre className="whitespace-pre-wrap">{logs?.stderr || "-"}</pre>
                        </div>
                      </details>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
