import { NextResponse } from "next/server";
import { getActiveRun, getRunnerMeta, listScenarios } from "../../../../lib/test-runner";

export const runtime = "nodejs";

const FIELD_LIMIT = 40_000; // 40 KB per stdout/stderr in the HTTP response

function trimLogs<T extends { stdout?: string; stderr?: string } | null>(obj: T): T {
  if (!obj) return obj;
  return {
    ...obj,
    stdout: typeof obj.stdout === "string" && obj.stdout.length > FIELD_LIMIT
      ? obj.stdout.slice(0, FIELD_LIMIT) + "\n…[truncated]"
      : obj.stdout,
    stderr: typeof obj.stderr === "string" && obj.stderr.length > FIELD_LIMIT
      ? obj.stderr.slice(0, FIELD_LIMIT) + "\n…[truncated]"
      : obj.stderr,
  };
}

export async function GET() {
  try {
    const scenarios = listScenarios().map((s) => ({
      ...s,
      latest: trimLogs(s.latest),
    }));

    const activeRun = getActiveRun();
    const trimmedRun = activeRun
      ? {
          ...activeRun,
          results: Object.fromEntries(
            Object.entries(activeRun.results).map(([k, v]) => [k, trimLogs(v)])
          ),
        }
      : null;

    return NextResponse.json({
      scenarios,
      activeRun: trimmedRun,
      meta: getRunnerMeta(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message, scenarios: [], activeRun: null }, { status: 500 });
  }
}
