"use client"

import { useEffect, useMemo, useState } from "react"
import type { Overview } from "@/lib/present/types"
import { byStaff, CaseView, CommandStatus, useAgent, useOperatorName, WhichOrder } from "../components/agent-case"
import { AppFrame } from "../components/app-frame"
import { Card } from "../components/card"
import { Icon } from "../components/icons"

export default function QueuePage() {
  const { agent, busy, last, send, watching } = useAgent()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [draft, setDraft] = useState({ area: "", orderRef: "", event: "", simulate: "", as: "" })
  const [eventOpen, setEventOpen] = useState(false)

  useEffect(() => {
    fetch("/api/overview").then((r) => r.json() as Promise<Overview>).then(setOverview).catch(() => {})
  }, [])

  const cards = useMemo(() => new Map((overview?.visible ?? []).map((card) => [card.reference, card])), [overview])
  const cases = agent?.cases ?? []
  // Three piles: something for you to do, waiting on the buyer or the agent, and nothing at all (closed or quiet).
  const me = useOperatorName()
  const yours = byStaff(cases.filter((c) => c.todo.length > 0), me)
  const waiting = byStaff(cases.filter((c) => !c.todo.length && c.waitingOn.length > 0), me)
  const quiet = cases.filter((c) => !c.todo.length && !c.waitingOn.length)
  const areas = agent?.areas ?? []
  const area = areas.find((a) => a.id === draft.area) ?? areas[0]
  const fromRecords = (overview?.visible ?? []).filter((card) => card.attention.length > 0 && !cases.some((c) => c.orderRef === card.reference)
    && areas.some((a) => a.lanes.includes(card.displayLane)))
  const view = (list: typeof cases) => <div className="cases">{list.map((c) => <CaseView key={c.orderRef} item={c} card={cards.get(c.orderRef)} zone={agent?.zone} send={send} busy={!!busy} compact />)}</div>

  return <AppFrame section="queue" snapshotAt={overview?.snapshotAt ?? null}><main className="page queue-page">
    <header className="queue-head">
      <h1 className="queue-title">Needs a person</h1>
      <p className="board-sub">{agent?.cases ? <><b>{yours.length}</b> order{yours.length === 1 ? "" : "s"} need you · <b>{waiting.length}</b> waiting on the buyer or the agent · <b>{fromRecords.length}</b> flagged in the records with no agent yet</> : "Loading…"}</p>
      <p className="note-text">The agent does the checking and proposes one plan per order. Nothing is booked, changed or sent to a buyer until a person approves it here. Bookings are mock.</p>
    </header>
    <div className="status-bar"><CommandStatus busy={busy} last={last} watching={watching} send={send} /></div>
    {agent?.error && <p className="board-error" role="alert">Could not reach the agent: {agent.error}</p>}

    {(agent?.unlinked?.length ?? 0) > 0 && <WhichOrder messages={agent!.unlinked!} zone={agent?.zone} refs={[...cards.keys()]} send={send} busy={!!busy} />}

    <section className="sec">
      <div className="sec-head"><h2>Needs you</h2><span className="count num">{yours.length}</span><span className="note">urgent first{me.trim() ? ", then orders you know" : ""}; each card says what to do</span></div>
      {agent?.cases && !yours.length && <p className="empty">Nothing waits for you right now.</p>}
      {view(yours)}
    </section>

    {waiting.length > 0 && <section className="sec">
      <div className="sec-head"><h2>Waiting on the buyer or the agent</h2><span className="count num">{waiting.length}</span><span className="note">nothing to do yet; they move up when it is your turn</span></div>
      {view(waiting)}
    </section>}

    {quiet.length > 0 && <section className="sec">
      <details className="more"><summary><Icon name="chevron" size={12} />Nothing to do: closed or quiet ({quiet.length})</summary>{view(quiet)}</details>
    </section>}

    <section className="panel trigger" aria-label="Send an event to the agent">
      <details open={eventOpen} onToggle={(e) => setEventOpen((e.target as HTMLDetailsElement).open)}>
        <summary className="panel-head"><Icon name="bot" size={14} />Send an event to the agent <span className="muted small">demo: stands in for monitoring alerts and driver messages</span></summary>
        <div className="trigger-samples">{areas.flatMap((a) => a.samples.map((s) => <button type="button" className="toggle" key={a.id + s.label}
          onClick={() => setDraft({ ...draft, area: a.id, orderRef: s.orderRef, event: s.event })}>{s.label} <span className="mono muted">{s.orderRef}</span></button>))}</div>
        <form className="trigger-form" onSubmit={(e) => { e.preventDefault(); if (area) send({ kind: "event", area: area.id, order_ref: draft.orderRef.trim(), event: draft.event, ...(draft.as ? { as: draft.as } : { simulate: draft.simulate }) }, `Agent run on ${draft.orderRef}`) }}>
          <select value={area?.id ?? ""} onChange={(e) => setDraft({ ...draft, area: e.target.value })} aria-label="Area">{areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
          <input className="mono" value={draft.orderRef} onChange={(e) => setDraft({ ...draft, orderRef: e.target.value })} placeholder="CD-420299" aria-label="Order reference" list="order-refs" />
          <datalist id="order-refs">{[...cards.keys()].map((ref) => <option key={ref} value={ref} />)}</datalist>
          <textarea value={draft.event} onChange={(e) => setDraft({ ...draft, event: e.target.value })} placeholder="What happened, as a monitoring alert or a driver report" aria-label="Event" rows={2} />
          <select value={draft.as} onChange={(e) => setDraft({ ...draft, as: e.target.value })} aria-label="Send as">
            <option value="">Send as a monitoring alert</option><option value="driver">Send as the driver on Telegram</option>
          </select>
          <select value={draft.simulate} onChange={(e) => setDraft({ ...draft, simulate: e.target.value })} aria-label="Test switch" disabled={draft.as === "driver"}>
            <option value="">Driver answers</option><option value="driver_unreachable">Test: driver does not answer</option>
          </select>
          <button type="submit" className="btn primary" disabled={!!busy || !draft.orderRef || !draft.event.trim()}>Send to agent</button>
        </form>
      </details>
    </section>

    {fromRecords.length > 0 && <section className="sec">
      <div className="sec-head"><h2>Flagged in the records, no agent case yet</h2><span className="note">{areas.map((a) => a.label).join(", ")} lanes only</span><span className="count num">{fromRecords.length}</span></div>
      <div className="record-grid">{fromRecords.map((card) => <div key={card.id} className="record-item">
        <Card card={card} />
        <button type="button" className="btn" onClick={() => { setDraft({ ...draft, area: areas.find((a) => a.lanes.includes(card.displayLane))?.id ?? "", orderRef: card.reference, event: card.attention.map((a) => a.title).join(". ") }); setEventOpen(true); document.querySelector(".trigger")?.scrollIntoView({ behavior: "smooth" }) }}>Prepare event for agent</button>
      </div>)}</div>
    </section>}
  </main></AppFrame>
}
