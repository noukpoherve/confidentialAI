import { NextResponse } from "next/server";
import { getActiveRun, getRun } from "../../../../lib/test-runner";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");
  if (!runId) {
    return NextResponse.json({ activeRun: getActiveRun() });
  }
  const run = getRun(runId);
  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
