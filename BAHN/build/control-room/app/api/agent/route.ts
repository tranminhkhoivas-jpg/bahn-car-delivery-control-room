import { NextResponse } from "next/server"
import { loadAgentCases, loadSettings, loadUnlinked, OPERATOR, runCommand } from "@/lib/agent"
import { AREAS } from "@/lib/areas"

export const runtime = "nodejs"
// An agent run can take a few minutes (driver questions, search, GLiDE).
export const maxDuration = 300

export async function GET() {
  try {
    const [cases, settings, unlinked] = await Promise.all([loadAgentCases(), loadSettings(), loadUnlinked()])
    // Staff see times in their own zone (Settings: employee_timezone); buyer times stay in the buyer's zone.
    const zone = settings.find((s) => s.key === "employee_timezone")?.value || "Europe/Helsinki"
    return NextResponse.json({ cases, zone, unlinked, areas: AREAS, operator: OPERATOR })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not read agent state", areas: AREAS, operator: OPERATOR }, { status: 502 })
  }
}

export async function POST(request: Request) {
  try {
    return NextResponse.json({ result: await runCommand(await request.json() as Record<string, unknown>) })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Command failed" }, { status: 400 })
  }
}
