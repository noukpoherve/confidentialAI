import { NextResponse } from "next/server";
import { getActiveRun, getRunnerMeta, listScenarios } from "../../../../lib/test-runner";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    scenarios: listScenarios(),
    activeRun: getActiveRun(),
    meta: getRunnerMeta(),
  });
}
