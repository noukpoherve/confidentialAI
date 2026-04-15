import { NextResponse } from "next/server";
import { startRun } from "../../../../lib/test-runner";

export const runtime = "nodejs";

interface RunBody {
  scenarioIds?: string[];
}

export async function POST(request: Request) {
  let body: RunBody = {};
  try {
    body = (await request.json()) as RunBody;
  } catch {
    // Empty body -> run all
  }

  const result = startRun(body.scenarioIds);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ runId: result.runId });
}
