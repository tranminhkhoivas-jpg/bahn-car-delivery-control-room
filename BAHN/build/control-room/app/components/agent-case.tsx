"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AgentCase, AgentProposal, AgentStep, PlanLine, UnlinkedMessage } from "@/lib/agent"
import { type Area, STEP_LABELS, WORKFLOW_LABELS } from "@/lib/areas"
import { fmtDateTime } from "@/lib/present/time"
import type { BoardCard } from "@/lib/present/types"
import { Icon } from "./icons"
import { Chip, Empty, More, SectionHead } from "./ui"

// Agent cases from n8n, shared by the Needs a person queue and the order record page.

export type AgentState = { cases?: AgentCase[]; zone?: string; unlinked?: UnlinkedMessage[]; areas: Area[]; operator: string; error?: string }
export type Send = (body: Record<string, unknown>, label: string) => Promise<void>
type Last = { label: string; ok: boolean; text: string }
type Watch = { label: string; until: number; base: number }

const TONE: Record<string, "danger" | "warn" | "accent" | "ok" | "neutral"> = {
  pending: "warn", waiting_for_person: "warn", waiting_on_person: "warn", needs_decision: "warn", failed: "danger", partly_executed: "warn",
  executed: "ok", done: "ok", closed_by_agent: "ok", rejected: "neutral", skipped: "neutral", in_progress: "accent", urgent: "danger",
  offered: "accent", deciding: "accent", expired: "neutral", replaced: "neutral", declined: "neutral",
}
const words = (code: string) => code.replaceAll("_", " ")
/** Why a plan can no longer be acted on, in plain words. */
const BANNER: Record<string, string> = {
  replaced: "Replaced by a newer plan. Nothing here will run; decide on the newer plan.",
  expired: "The offer ran out before the buyer answered. Any answer now is not valid; the agent makes a revised plan.",
  offered: "Sent to the buyer. Waiting for their choice; nothing is booked yet and the driver keeps to the current plan.",
  deciding: "Someone is deciding this plan right now.",
  failed: "Stopped: a booking or the final check failed. The agent re-plans by itself.",
}

// Your name goes on every decision and message (kept in this browser only).
const NAME_KEY = "bahn-operator"
const operatorName = () => { try { return localStorage.getItem(NAME_KEY) ?? "" } catch { return "" } }
function OperatorField() {
  const [name, setName] = useState("")
  useEffect(() => { setName(operatorName()) }, [])
  return <label className="small operator-field">Your name <input value={name} placeholder="e.g. Aino (ops)" aria-label="Your name"
    onChange={(e) => { setName(e.target.value); try { localStorage.setItem(NAME_KEY, e.target.value) } catch {} }} /></label>
}

/** Message text with Telegram media markers turned into links to the file. */
function MessageText({ text }: { text: string }) {
  const parts = text.split(/(\[media [\w]+ [\w-]+\])/)
  return <p>{parts.map((part, k) => {
    const m = part.match(/^\[media ([\w]+) ([\w-]+)\]$/)
    return m ? <a key={k} className="ref-link" href={`/api/media/${m[2]}`} target="_blank" rel="noreferrer">Open {words(m[1])}</a> : part
  })}</p>
}

const lastReport = (state: AgentState | null) => Math.max(0, ...(state?.cases ?? []).flatMap((c) => c.timeline.filter((l) => l.kind === "run_report").map((l) => l.id)))
const WATCH_MS = 6 * 60_000 // ponytail: a routed run with several workflows takes 2-5 min; stop polling after 6

/** Loads agent state and sends a person's commands; polls while a command runs so the timeline grows. */
export function useAgent() {
  const [agent, setAgent] = useState<AgentState | null>(null)
  const [busy, setBusy] = useState("")
  const [last, setLast] = useState<Last | null>(null)
  const [watch, setWatch] = useState<Watch | null>(null)
  const latest = useRef<AgentState | null>(null)

  const refresh = useCallback(() => fetch("/api/agent", { cache: "no-store" }).then((r) => r.json() as Promise<AgentState>)
    .then((state) => { latest.current = state; setAgent(state) }).catch(() => {}), [])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (!busy && !watch) return
    const timer = setInterval(refresh, 4000)
    return () => clearInterval(timer)
  }, [busy, watch, refresh])
  useEffect(() => { // agent runs answer at once and work in the background; stop polling once a new run report lands
    if (watch && (lastReport(agent) > watch.base || Date.now() > watch.until)) setWatch(null)
  }, [agent, watch])

  const send: Send = async (body, label) => {
    setBusy(label)
    setLast(null)
    try {
      const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, operator: operatorName() }) })
      const data = await response.json() as { result?: unknown; error?: string }
      const result = data.result as { ok?: boolean; error?: string; output?: string; result?: string; agent_woken?: boolean } | undefined
      const ok = response.ok && result?.ok !== false
      const event = body.kind === "event" || body.kind === "link_message" || (body.kind === "task_action" && body.action !== "urgent") // these start a router run
      if (ok && (event || result?.agent_woken)) setWatch({ label: event ? `Agent working on ${String(body.order_ref)}` : "Agent picking up the next step", until: Date.now() + WATCH_MS, base: lastReport(latest.current) })
      setLast({ label, ok, text: data.error ?? result?.error ?? result?.output ?? result?.result
        ?? (event && ok ? "Sent. The router picks the problem workflows; their report appears here in a few minutes." : ok ? "Done." : "Failed.") })
    } catch (cause) {
      setLast({ label, ok: false, text: cause instanceof Error ? cause.message : "Request failed" })
    } finally {
      setBusy("")
      refresh()
    }
  }
  return { agent, busy, last, send, watching: watch?.label ?? "" }
}

export function CommandStatus({ busy, last, watching = "" }: { busy: string; last: Last | null; watching?: string }) {
  return <>
    <OperatorField />
    {busy && <p className="trigger-status tone-accent" role="status"><span className="spinner" />{busy}…</p>}
    {!busy && watching && <p className="trigger-status tone-accent" role="status"><span className="spinner" />{watching}… it checks, asks the driver and files one plan; notes appear as it works.</p>}
    {last && <p className={`trigger-status tone-${last.ok ? "ok" : "danger"}`} role="status"><b>{last.label}:</b> {last.text}</p>}
  </>
}

/** The live agent case for one order, on its record page. */
export function AgentWorkSection({ reference }: { reference: string }) {
  const { agent, busy, last, send, watching } = useAgent()
  const item = agent?.cases?.find((c) => c.orderRef === reference)
  return <section className="sec" id="agent">
    <SectionHead title="Agent case" note="Live from the area agents in n8n" />
    {agent?.error && <p className="board-error" role="alert">Could not reach n8n: {agent.error}</p>}
    {agent?.cases && !item && <Empty>No agent has worked on this order yet. Send it an event from <a className="ref-link" href="/queue">Needs a person</a>.</Empty>}
    {item && <CaseView item={item} zone={agent?.zone} send={send} busy={!!busy} />}
    <CommandStatus busy={busy} last={last} watching={watching} />
  </section>
}

export function CaseView({ item, card, zone, send, busy }: { item: AgentCase; card?: BoardCard; zone?: string; send: Send; busy: boolean }) {
  const open = item.proposals.filter((p) => p.status === "pending" || p.steps.some((s) => s.status === "waiting_for_person" || (s.status === "failed" && !s.superseded)))
  const done = item.proposals.filter((p) => !open.includes(p))
  return <article className={`case${item.needsPerson.length ? " case-waiting" : ""}`}>
    <header className="case-head">
      <div>
        <div className="case-title">{card ? <a className="ref-link" href={`/orders/${card.id}`}>{item.orderRef}</a> : <span className="mono">{item.orderRef}</span>}
          {card && <span className="muted"> · {card.vehicle} · {card.customer} · {card.from.city} → {card.to.city}</span>}</div>
        {item.summary && <p className="case-summary">{item.summary}</p>}
      </div>
      <div className="chips">{item.workflows.map((w) => <span className="chip-fact" key={w}>{WORKFLOW_LABELS[w] ?? w}</span>)}
        <Chip tone={TONE[item.status] ?? "neutral"} dot>{words(item.status)}</Chip></div>
    </header>
    {item.needsPerson.length > 0 && <ul className="case-reasons">{item.needsPerson.map((r) => <li key={r}><Icon name="alert" size={13} className={r.startsWith("Urgent") ? "tone-danger" : "tone-warn"} /> {r}</li>)}</ul>}
    {item.escalations.length > 0 && <div className="proposal"><div className="proposal-head"><b>Staff tasks and reminders</b><span className="muted small">no approval needed for tasks; reminders go out when you approve them</span></div>
      <ol className="steps">{item.escalations.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol></div>}
    {item.report && <div className="report"><div className="muted small">Agent report · {fmtDateTime(item.report.at, zone)}</div><p>{item.report.text.replaceAll("**", "")}</p></div>}
    {open.map((p) => <ProposalView key={p.id} p={p} send={send} busy={busy} />)}
    {done.length > 0 && <More label={`Earlier proposals (${done.length})`}>{done.map((p) => <ProposalView key={p.id} p={p} send={send} busy={busy} />)}</More>}
    <DriverMessage orderRef={item.orderRef} send={send} busy={busy} />
    <More label={`Conversation on Telegram (${item.messages.length})`}>
      <ol className="case-timeline">{item.messages.map((m) => <li key={m.id}>
        <span className="muted num">{fmtDateTime(m.at, zone)}</span> <b>{m.direction === "out" ? `Bahn to ${words(m.role)}` : words(m.role)}</b> <span className="muted">{words(m.kind)}{m.status && m.status !== "sent" && m.status !== "received" ? ` · ${m.status}` : ""}</span>
        <MessageText text={m.text} />
      </li>)}</ol>
    </More>
    <More label={`What the agent checked and did (${item.timeline.length})`}>
      <ol className="case-timeline">{item.timeline.map((line) => <li key={line.id}>
        <span className="muted num">{fmtDateTime(line.at, zone)}</span> <b>{line.actor}</b> <span className="muted">{words(line.kind)}</span><MessageText text={line.text} />
      </li>)}</ol>
    </More>
  </article>
}

/** "Which order?": Telegram messages the bot could not link. Staff pick the order and who wrote; the agent then wakes on it. */
export function WhichOrder({ messages, zone, refs, send, busy }: { messages: UnlinkedMessage[]; zone?: string; refs: string[]; send: Send; busy: boolean }) {
  return <section className="panel" aria-label="Telegram messages with no order">
    <div className="panel-head"><Icon name="alert" size={14} />Which order? ({messages.length})</div>
    <p className="muted small">The bot could not tell which order these Telegram messages are about. Pick the order and who wrote; the agent then works on it.</p>
    <ol className="case-timeline">{messages.map((m) => <UnlinkedRow key={m.id} m={m} zone={zone} refs={refs} send={send} busy={busy} />)}</ol>
  </section>
}

function UnlinkedRow({ m, zone, refs, send, busy }: { m: UnlinkedMessage; zone?: string; refs: string[]; send: Send; busy: boolean }) {
  const [orderRef, setOrderRef] = useState("")
  const [role, setRole] = useState("buyer")
  return <li><span className="muted num">{fmtDateTime(m.at, zone)}</span><MessageText text={m.text} />
    <div className="decide">
      <input className="mono" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} placeholder="CD-420299" aria-label="Order reference" list={`refs-${m.id}`} />
      <datalist id={`refs-${m.id}`}>{refs.map((ref) => <option key={ref} value={ref} />)}</datalist>
      <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Who wrote">
        <option value="buyer">Buyer</option><option value="driver">Driver</option><option value="delivery_contact">Delivery contact</option>
      </select>
      <button type="button" className="btn primary" disabled={busy || !/^CD-\d+$/.test(orderRef.trim())} onClick={() => send({ kind: "link_message", message_id: m.id, order_ref: orderRef.trim(), role }, `Linked to ${orderRef.trim()}`)}>Link and wake agent</button>
    </div>
  </li>
}

/** Staff write to the driver directly; drivers need no approval. The reply comes back to the agent. */
function DriverMessage({ orderRef, send, busy }: { orderRef: string; send: Send; busy: boolean }) {
  const [text, setText] = useState("")
  return <div className="decide">
    <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message to the driver (sent on Telegram now, no approval needed)" aria-label="Message to the driver" />
    <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => send({ kind: "driver_message", order_ref: orderRef, text }, "Message to driver").then(() => setText(""))}>Send to driver</button>
  </div>
}

function ProposalView({ p, send, busy }: { p: AgentProposal; send: Send; busy: boolean }) {
  const [note, setNote] = useState("")
  const [simulate, setSimulate] = useState("")
  const plan = p.plan
  const kinds = new Set([...(plan?.steps ?? []), ...(plan?.options ?? []).flatMap((o) => o.steps ?? [])].map((s) => s.kind))
  const options = plan?.options ?? []
  const [option, setOption] = useState(plan?.chosen || plan?.recommended || options[0]?.key || "")
  const decide = (extra: Record<string, unknown>, label: string) => send({ kind: "decide", proposal_id: p.id, decision: "approve", note, simulate, ...(option ? { option } : {}), ...extra }, label)
  return <div className="proposal">
    <div className="proposal-head"><b>{p.label} #{p.id}</b><Chip tone={TONE[p.status] ?? "neutral"}>{words(p.status)}</Chip>
      {plan && <span className="muted num">EUR {plan.total_eur ?? 0}{plan.option_id ? ` · ${plan.on_time ? `on time, ${plan.buffer_hours} h buffer` : `${plan.late_hours} h late`}` : ""}{plan.source === "mock_generated" ? " · simulated sailing" : ""}</span>}</div>
    {BANNER[p.status] && <p className={`trigger-status tone-${TONE[p.status] ?? "neutral"}`}>{BANNER[p.status]}</p>}
    {p.summary && <p className="proposal-summary">{p.summary}</p>}
    {options.length > 0 && <table className="options-table">
      <thead><tr><th>Option</th><th>Arrives (buyer's local time)</th><th>Delivery window</th><th className="num">Total</th></tr></thead>
      <tbody>{options.map((o) => <tr key={o.key}>
        <td><label>{p.status === "pending" && <input type="radio" name={`opt-${p.id}`} checked={option === o.key} onChange={() => setOption(o.key)} />} <b>{o.key}</b> {o.names.join(" / ")}{o.key === plan?.recommended ? " (recommended)" : ""}{o.key === plan?.chosen ? " (chosen)" : ""}</label></td>
        <td>{o.arrives_local}</td><td>{o.on_time === false ? `${o.late_hours ?? "?"} h late` : "on time"}</td><td className="num">EUR {o.total_eur}</td>
      </tr>)}</tbody>
    </table>}
    {plan?.valid_until_local && <p className="proposal-why"><b>Offer valid until.</b> {plan.valid_until_local} (buyer's local time). A buyer answer after that is not valid; the agent makes a revised plan.</p>}
    {p.detail && <p className="proposal-detail">{p.detail}</p>}
    {p.rationale && <p className="proposal-why"><b>Why.</b> {p.rationale}</p>}
    {plan?.alternatives && plan.alternatives.length > 0 && <p className="proposal-why"><b>Next best.</b> {plan.alternatives.join(" · ")}</p>}
    {p.evidence.length > 0 && <div className="chips">{p.evidence.map((e) => <span className="chip-fact mono" key={e}>{e}</span>)}</div>}
    {p.status !== "pending" && (p.decidedBy || p.result) && <p className="proposal-why"><b>Decision.</b> {p.decidedBy}{p.decisionNote ? `: “${p.decisionNote}”` : ""}{p.result ? ` · ${p.result}` : ""}</p>}
    {p.status === "pending" && <div className="decide">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the record (optional)" aria-label="Decision note" />
      {plan && <select value={simulate} onChange={(e) => setSimulate(e.target.value)} aria-label="Test a booking failure">
        <option value="">Bookings succeed</option>
        {kinds.has("book_ferry") && <><option value="ferry_sold_out">Test: ferry sells out</option><option value="ferry_timeout_once">Test: ferry times out once</option></>}
        {kinds.has("book_hotel") && <option value="hotel_timeout">Test: hotel times out</option>}
        {kinds.has("book_train") && <option value="train_sold_out">Test: train sells out</option>}
        {kinds.has("book_flight") && <option value="flight_sold_out">Test: flight sells out</option>}
      </select>}
      {plan?.needs_buyer
        ? <button type="button" className="btn primary" disabled={busy} onClick={() => decide({}, `Approve #${p.id}`)}>Approve and send to buyer</button>
        : <>
          <button type="button" className="btn primary" disabled={busy} onClick={() => decide({}, `Approve #${p.id}`)}>{plan ? "Approve and book now" : "Approve"}</button>
          {plan && <button type="button" className="btn" disabled={busy} onClick={() => decide({ send: "ask_buyer" }, `Ask buyer first #${p.id}`)}>Approve, ask buyer first</button>}
        </>}
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "decide", proposal_id: p.id, decision: "reject", note }, `Reject #${p.id}`)}>Reject</button>
    </div>}
    {p.status === "pending" && plan && plan.steps.length > 0 && <ol className="steps">{plan.steps.map((s, k) => <li className="agent-step" key={k}>
      <div className="step-line"><b>{STEP_LABELS[s.kind] ?? words(s.kind)}</b>{s.cost_cents > 0 && <span className="num">EUR {s.cost_cents / 100}</span>}</div>
      <p className="step-detail">{s.detail}</p></li>)}</ol>}
    {p.steps.length > 0 && <ol className="steps">{p.steps.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol>}
    {p.status === "pending" && plan && <p className="muted small">{onApproval(plan.steps)}</p>}
  </div>
}

const PERSON_STEPS = new Set(["customer_message", "buyer_decision", "staff_task"])
/** "On approval: ..." from the plan's step kinds: bookings and records run (mock), people steps wait. */
function onApproval(steps: PlanLine[]) {
  const names = (keep: boolean) => [...new Set(steps.filter((s) => PERSON_STEPS.has(s.kind) === keep).map((s) => (STEP_LABELS[s.kind] ?? words(s.kind)).toLowerCase()))].join(", ")
  const auto = names(false), people = names(true)
  return `On approval: ${auto ? `${auto} (mock)` : "nothing runs by itself"}${people ? `; then waits for a person: ${people}` : ""}.`
}

function StepView({ s, send, busy }: { s: AgentStep; send: Send; busy: boolean }) {
  const [note, setNote] = useState("")
  const actionable = s.status === "waiting_for_person" || (s.status === "failed" && !s.superseded)
  const answer = s.kind === "buyer_decision" // the buyer's answer is what wakes the agent
  const ask = (s.note.match(/\[ask_time (ready|handover)\]/) ?? [])[1] // the agent asked for a time: date-time field, or not known yet
  const [time, setTime] = useState("")
  // Step 0 of a new plan: "updated offer follows" notice for a buyer whose open offer was replaced (propose_action); done = the bot sends it.
  const holding = s.kind === "customer_message" && s.no === 0 && s.proposalId > 0
  return <li className="agent-step">
    <div className="step-line"><Chip tone={s.superseded ? "neutral" : TONE[s.status] ?? "neutral"}>{s.superseded ? "replaced by later booking" : words(s.status)}</Chip>
      <b>{s.reminder ? `Reminder ${s.no || ""} draft: ${s.label.toLowerCase()}` : s.label}</b>{s.ref && <span className="mono muted">{s.kind === "staff_task" && s.proposalId === 0 ? `${s.ref} priority` : s.ref}</span>}{s.costCents ? <span className="num">EUR {s.costCents / 100}</span> : null}{s.attempts > 1 && <span className="muted">{s.attempts} tries</span>}</div>
    <p className="step-detail">{s.detail}</p>
    {s.note && <p className="muted small">{s.note}</p>}
    {actionable && ask && s.status === "waiting_for_person" && <div className="decide">
      <label className="small">{ask === "ready" ? "Car ready at" : "Driver can start driving at"} <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" /></label>
      <span className="muted small">Empty = not known yet (staff are asked again later; nothing is rebooked meanwhile).</span>
    </div>}
    {actionable && holding && s.status === "waiting_for_person" && <div className="decide">
      <button type="button" className="btn primary" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "done", note: "updated-offer notice approved" }, "Buyer told an updated offer is coming")}>Approve and send to buyer</button>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "failed", note: "updated-offer notice not sent (staff choice)" }, "Notice not sent")}>Don't send</button>
    </div>}
    {actionable && s.reminder && s.status === "waiting_for_person" && <div className="decide">
      <button type="button" className="btn primary" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "done", note: "reminder approved" }, "Reminder sent")}>Approve and send reminder</button>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "failed", note: "reminder not sent (staff choice)" }, "Reminder not sent")}>Don't send</button>
    </div>}
    {actionable && !s.reminder && !holding && <div className="decide">
      {(answer || s.kind === "staff_task") && s.status === "waiting_for_person" && <input value={note} onChange={(e) => setNote(e.target.value)}
        placeholder={answer ? "Buyer's answer (accepted, or the time they want)" : "What you did or found (optional)"} aria-label={answer ? "Buyer's answer" : "Note"} />}
      <button type="button" className="btn primary" disabled={busy || (answer && !note.trim())} onClick={() => send({ kind: "step", step_id: s.id, outcome: "done", note, ...(ask && time ? { time: new Date(time).toISOString() } : {}) }, `${s.label}: done`)}>{s.kind === "customer_message" ? "Sent by me" : answer ? "Record answer" : "Mark done"}</button>
      {s.status === "failed" && s.kind === "book_hotel" && <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "retry" }, `${s.label}: retry`)}>Retry booking</button>}
      {s.status === "waiting_for_person" && <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "failed", note }, `${s.label}: failed`)}>Could not do it</button>}
    </div>}
    {s.kind === "staff_task" && s.proposalId === 0 && s.status === "waiting_for_person" && <div className="decide">
      <span className="muted small">Ask the agent to plan (you approve the plan):</span>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "replacement", note }, "Replacement driver requested")}>Replacement driver</button>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "cancel", note }, "Cancellation plan requested")}>Plan cancellation</button>
      {s.ref !== "urgent" && <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "urgent", note }, "Marked urgent")}>Mark urgent</button>}
    </div>}
  </li>
}
