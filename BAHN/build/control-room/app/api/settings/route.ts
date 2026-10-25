import { NextResponse } from "next/server"
import { loadSettings, saveSetting } from "@/lib/agent"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json({ settings: await loadSettings() })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not read settings" }, { status: 502 })
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json() as { key?: unknown; value?: unknown }
    return NextResponse.json({ setting: await saveSetting(String(key ?? ""), String(value ?? "")) })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not save" }, { status: 400 })
  }
}
