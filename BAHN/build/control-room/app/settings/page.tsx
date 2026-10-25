"use client"

import { useEffect, useState } from "react"
import type { Setting } from "@/lib/agent"
import { AppFrame } from "../components/app-frame"

// Every number the agent plans with, grouped. All are placeholders until Bahn sets its own; a change applies to the next agent step.
export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[] | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, string>>({})
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((body: { settings?: Setting[]; error?: string }) => body.settings ? setSettings(body.settings) : setError(body.error ?? "Could not read settings")).catch(() => setError("Could not reach the control room server"))
  }, [])

  async function save(key: string) {
    setStatus({ ...status, [key]: "Saving" })
    const body = await fetch("/api/settings", { method: "POST", body: JSON.stringify({ key, value: edits[key] }) }).then((r) => r.json()) as { setting?: Setting; error?: string }
    if (body.setting) {
      setSettings((list) => list?.map((s) => s.key === key ? body.setting! : s) ?? null)
      setEdits(({ [key]: _, ...rest }) => rest)
    }
    setStatus((s) => ({ ...s, [key]: body.setting ? "Saved" : body.error ?? "Not saved" }))
  }

  const sections = [...new Set((settings ?? []).map((s) => s.section))]
  return <AppFrame section="settings"><main className="page queue-page">
    <header className="queue-head">
      <h1 className="queue-title">Settings</h1>
      <p className="note-text">The numbers the agent plans with. Every value here is a placeholder we picked; Bahn sets its own. A change applies from the agent&apos;s next step. Times are stored in UTC.</p>
    </header>
    {error && <p className="board-error" role="alert">{error}</p>}
    {!settings && !error && <p className="empty">Loading settings</p>}
    {sections.map((section) => <section className="panel" key={section} aria-label={section}>
      <div className="panel-head">{section}</div>
      <div className="panel-rows">{settings!.filter((s) => s.section === section).map((s) => {
        const value = edits[s.key] ?? s.value
        return <form className="setting-row" key={s.key} onSubmit={(e) => { e.preventDefault(); save(s.key) }}>
          <label htmlFor={`set-${s.key}`} className="setting-label"><span className="panel-row-title">{s.key.replaceAll("_", " ")}</span><span className="panel-row-detail">{s.description}</span></label>
          <span className="setting-input">
            {s.unit === "on/off"
              ? <select id={`set-${s.key}`} value={value} onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })}><option value="on">on</option><option value="off">off</option></select>
              : <input id={`set-${s.key}`} className="mono" value={value} onChange={(e) => setEdits({ ...edits, [s.key]: e.target.value })} inputMode={/^[a-z]/i.test(s.unit) && s.unit !== "x" ? "text" : "decimal"} />}
            <span className="muted">{s.unit}</span>
            <button type="submit" className="btn" disabled={edits[s.key] === undefined || edits[s.key] === s.value}>Save</button>
          </span>
          {status[s.key] && <span className="setting-status" role="status">{status[s.key]}</span>}
        </form>
      })}</div>
    </section>)}
  </main></AppFrame>
}
