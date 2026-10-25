"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { AgentCase, AgentProposal, AgentStep, PlanLine, UnlinkedMessage } from "@/lib/agent"
import { type Area, STATUS_WORDS, STEP_LABELS, WORKFLOW_LABELS } from "@/lib/areas"
import { fmtDateTime } from "@/lib/present/time"
import type { BoardCard } from "@/lib/present/types"
import { Icon } from "./icons"
import { Chip, Empty, More, SectionHead } from "./ui"

// Agent cases from n8n, shared by the Needs a person queue and the order record page.
// Written for Bahn's operations staff, not for the people who built it: plain words, one list of what to do, old plans greyed out.

export type AgentState = { cases?: AgentCase[]; zone?: string; unlinked?: UnlinkedMessage[]; areas: Area[]; operator: string; error?: string }
export type Send = (body: Record<string, unknown>, label: string) => Promise<void>
/** retry: a note the agent found unclear; staff may send it again as written. */
type Last = { label: string; ok: boolean; text: string; retry?: Record<string, unknown> }
type Watch = { label: string; until: number; base: number }

const TONE: Record<string, "danger" | "warn" | "accent" | "ok" | "neutral"> = {
  pending: "warn", waiting_for_person: "warn", waiting_on_person: "accent", needs_decision: "warn", failed: "danger", partly_executed: "warn",
  executed: "ok", done: "ok", closed_by_agent: "neutral", rejected: "neutral", skipped: "neutral", in_progress: "accent", urgent: "danger",
  offered: "accent", deciding: "accent", expired: "neutral", replaced: "neutral", declined: "neutral",
}
const words = (code: string) => code.replaceAll("_", " ")
const status = (code: string) => STATUS_WORDS[code] ?? words(code)
const short = (text: string, n = 160) => text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text
/** Plans that can no longer run. The newest plan in one of these states means the agent owes a new one. */
const DEAD = new Set(["replaced", "rejected", "expired", "declined"])
const MESSAGE_KINDS = new Set(["customer_message", "delivery_contact_message"])
/** Why a plan looks the way it does, in plain words. */
const BANNER: Record<string, string> = {
  replaced: "Replaced by a newer plan. Nothing here will run.",
  expired: "The buyer did not answer in time. The agent makes a new offer.",
  offered: "Sent to the buyer. Nothing is booked until they choose; the driver keeps to the current plan.",
  deciding: "Someone is deciding this plan right now.",
  failed: "A booking or the last check before booking failed. Nothing else ran. The agent makes a new plan by itself.",
  rejected: "Rejected. The agent makes a new plan that avoids the reason given.",
  declined: "The buyer said no. The agent makes a new plan.",
  partly_executed: "Carried out, but a step did not work. See the steps below.",
}
const OLD_EXECUTED = "An older plan that was carried out: the bookings and messages below happened (mock). A newer plan came after it."
const isOpen = (s: AgentStep) => (s.status === "waiting_for_person" && !s.stale) || (s.status === "failed" && s.kind === "book_hotel" && !s.superseded)

// Your name goes on every decision and message (kept in this browser only).
const NAME_KEY = "bahn-operator"
const operatorName = () => { try { return localStorage.getItem(NAME_KEY) ?? "" } catch { return "" } }
/** The name in the field, live: cases re-sort and re-tag as it is typed (also across tabs). */
export function useOperatorName() {
  const [name, setName] = useState("")
  useEffect(() => {
    const read = () => setName(operatorName())
    read()
    window.addEventListener(NAME_KEY, read)
    window.addEventListener("storage", read)
    return () => { window.removeEventListener(NAME_KEY, read); window.removeEventListener("storage", read) }
  }, [])
  return name
}
function OperatorField() {
  const name = useOperatorName()
  return <label className="small operator-field">Your name <input value={name} placeholder="e.g. Aino (ops)" aria-label="Your name"
    onChange={(e) => { try { localStorage.setItem(NAME_KEY, e.target.value) } catch {} window.dispatchEvent(new Event(NAME_KEY)) }} /></label>
}

/** Soft preference, not a lock: mine = this person is on the order's history; 1 = nobody yet; 2 = only others. */
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const history = (item: AgentCase, me: string) => !me.trim() ? 0 : item.handledBy.some((n) => sameName(n, me)) ? 1 : item.handledBy.length ? 3 : 2
/** Urgent orders stay first; inside each block: the person's own orders, then new ones, then orders others worked on. The sort is stable. */
export function byStaff(list: AgentCase[], me: string): AgentCase[] {
  return [...list].sort((a, b) => Number(b.status === "urgent") - Number(a.status === "urgent") || history(a, me) - history(b, me))
}

/** Message text with Telegram media markers turned into links to the file. */
function MessageText({ text }: { text: string }) {
  const parts = text.split(/(\[media [\w]+ [\w-]+\])/)
  return <p>{parts.map((part, k) => {
    const m = part.match(/^\[media ([\w]+) ([\w-]+)\]$/)
    return m ? <a key={k} className="ref-link" href={`/api/media/${m[2]}`} target="_blank" rel="noreferrer">Open {words(m[1])}</a> : part
  })}</p>
}

/** Bolds what staff scan for: prices, times, dates, order and plan numbers. */
const KEY_FACT = /(EUR\s?[\d.,]+|\d{4}-\d{2}-\d{2}T[\d:.]+Z?|\b\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2}:\d{2}Z?|\b\d{1,2}:\d{2}Z?\b|\bCD-\d+\b|plan #\d+|option [A-D]\b)/gi
function Skim({ text }: { text: string }) {
  return <>{text.split(KEY_FACT).map((part, k) => k % 2 ? <b key={k} className="fact">{part}</b> : part)}</>
}

/** First sentence shown, the rest folded: long agent text stays skimmable. */
function Folded({ text, label = "Read all" }: { text: string; label?: string }) {
  const clean = text.replace(/^\*\*Order\*\*[^|\n]*\|\s*/, "").replaceAll("**", "").trim() // the card title already names the order and car
  const found = clean.slice(80).search(/(?<=[.!?])\s|\n/), cut = found < 0 ? -1 : found + 80 // at least a full sentence or two
  if (cut < 0 || clean.length < 220) return <p><Skim text={clean} /></p>
  return <><p><Skim text={clean.slice(0, cut)} /></p><More label={label}><p><Skim text={clean.slice(cut).trim()} /></p></More></>
}

/** What each button does and what it needs, one short line each, under a row of buttons. */
function Help({ items }: { items: [string, string][] }) {
  return <ul className="btn-help">{items.map(([button, what]) => <li key={button}><b>{button}</b> {what}</li>)}</ul>
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
      const result = data.result as { ok?: boolean; error?: string; output?: string; result?: string; agent_woken?: boolean; unclear?: boolean; question?: string } | undefined
      const ok = response.ok && result?.ok !== false
      const event = body.kind === "event" || body.kind === "link_message" || (body.kind === "task_action" && body.action !== "urgent") // these start a router run
      if (ok && (event || result?.agent_woken)) setWatch({ label: event ? `Agent working on ${String(body.order_ref ?? "the order")}` : "Agent picking up the next step", until: Date.now() + WATCH_MS, base: lastReport(latest.current) })
      if (result?.unclear) setLast({ label, ok: false, retry: body, text: `Your note may be unclear to the agent: ${result.question ?? "please write it more precisely"} Rewrite it, or send it as written.` })
      else setLast({ label, ok, text: data.error ?? result?.error ?? result?.output ?? result?.result
        ?? (event && ok ? "Sent. The agent's note appears on the order in a few minutes." : ok ? "Done." : "Failed.") })
    } catch (cause) {
      setLast({ label, ok: false, text: cause instanceof Error ? cause.message : "Request failed" })
    } finally {
      setBusy("")
      refresh()
    }
  }
  return { agent, busy, last, send, watching: watch?.label ?? "" }
}

export function CommandStatus({ busy, last, watching = "", send }: { busy: string; last: Last | null; watching?: string; send?: Send }) {
  return <div className="command-status">
    <OperatorField />
    {busy && <p className="trigger-status tone-accent" role="status"><span className="spinner" />{busy}…</p>}
    {!busy && watching && <p className="trigger-status tone-accent" role="status"><span className="spinner" />{watching}… it checks, asks the driver and files one plan; notes appear as it works.</p>}
    {last && <p className={`trigger-status tone-${last.ok ? "ok" : "danger"}`} role="status"><b>{last.label}:</b> {last.text}
      {last.retry && send && <button type="button" className="btn" onClick={() => send({ ...last.retry, confirm_unclear: true }, last.label)}>Send as written</button>}</p>}
  </div>
}

/** The live agent case for one order, on its record page. */
export function AgentWorkSection({ reference }: { reference: string }) {
  const { agent, busy, last, send, watching } = useAgent()
  const item = agent?.cases?.find((c) => c.orderRef === reference)
  return <section className="sec" id="agent">
    <SectionHead title="Agent case" note="What the agent did on this order and what waits for you" />
    {agent?.error && <p className="board-error" role="alert">Could not reach the agent: {agent.error}</p>}
    {agent?.cases && !item && <Empty>No agent has worked on this order yet. Send it an event from <a className="ref-link" href="/queue">Needs a person</a>.</Empty>}
    <CommandStatus busy={busy} last={last} watching={watching} send={send} />
    {item && <CaseView item={item} zone={agent?.zone} send={send} busy={!!busy} />}
  </section>
}

/** compact: on the queue each order is one line until opened, so one big case does not push the others off screen. */
export function CaseView({ item, card, zone, send, busy, compact = false }: { item: AgentCase; card?: BoardCard; zone?: string; send: Send; busy: boolean; compact?: boolean }) {
  const [newest, ...rest] = item.proposals
  const current = newest && !DEAD.has(newest.status) ? newest : undefined
  const older = current ? rest : item.proposals
  const tasks = item.escalations.filter(isOpen), finished = item.escalations.filter((s) => !isOpen(s))
  const notes = item.timeline.filter((l) => l.kind === "staff_note")
  const quiet = !item.todo.length
  const title = compact
    ? <span className="case-title"><span className="mono">{item.orderRef}</span>{card && <span className="muted small case-sub">{card.vehicle} · {card.from.city} → {card.to.city}</span>}</span>
    : <span className="case-title">{card ? <a className="ref-link" href={`/orders/${card.id}`}>{item.orderRef}</a> : <span className="mono">{item.orderRef}</span>}
      {card && <span className="muted"> · {card.vehicle} · {card.from.city} → {card.to.city}</span>}</span>
  const me = useOperatorName(), seen = history(item, me)
  const chips = <span className="chips">
    {seen === 1 && <span className="chip-fact tag-known">Worked with before</span>}
    {seen === 3 && <span className="chip-fact tag-other">Last handled by {item.lastHandler}</span>}
    {item.workflows.map((w) => <span className="chip-fact" key={w}>{WORKFLOW_LABELS[w] ?? w}</span>)}
    <Chip tone={TONE[item.status] ?? "neutral"} dot>{status(item.status)}</Chip></span>
  const body = <>
    {!compact && <header className="case-head"><div>{title}</div>{chips}</header>}
    {card && <p className="muted small">{compact && <><a className="ref-link" href={`/orders/${card.id}`}>Open order record</a> · </>}Buyer: {card.customer}</p>}
    {item.summary && <p className="case-summary"><Skim text={item.summary} /></p>}

    {item.todo.length > 0 && <div className="todo">
      <b>What you need to do</b>
      <ol>{item.todo.map((t) => <li key={t.anchor + t.action}><a href={`#${t.anchor}`} className={t.urgent ? "tone-danger" : undefined}>{t.action}</a>
        {t.detail && <span className="todo-detail"><Skim text={t.detail} /></span>}</li>)}</ol>
    </div>}
    {item.waitingOn.length > 0 && <div className="waiting-on">
      <b>Waiting on others</b> <span className="muted small">nothing for you to do here yet</span>
      <ul>{item.waitingOn.map((w) => <li key={w}><Skim text={w} /></li>)}</ul>
    </div>}
    {quiet && !item.waitingOn.length && <p className="muted small nothing">Nothing for you to do on this order{item.status === "closed_by_agent" ? ": the agent closed the case." : " right now."}</p>}

    {item.report && <div className="report" id={`note-${item.orderRef}`}><div className="muted small">Agent's latest note · {fmtDateTime(item.report.at, zone)}</div><Folded text={item.report.text} label="Read the whole note" /></div>}

    {(tasks.length > 0 || finished.length > 0) && <div className="proposal">
      <div className="proposal-head"><b>Tasks and reminders</b><span className="muted small">not part of a plan; reminders go out only when you send them</span></div>
      {tasks.length > 0 && <ol className="steps">{tasks.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol>}
      {finished.length > 0 && <More label={`Finished or skipped (${finished.length})`}><ol className="steps">{finished.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol></More>}
    </div>}

    {current && <ProposalView p={current} send={send} busy={busy} />}
    {!current && newest && <p className="muted small nothing">No current plan: plan #{newest.id} was {status(newest.status).toLowerCase()}. The agent makes a new one.</p>}
    {older.length > 0 && <More label={`Older plans (${older.length})${older.some((p) => p.steps.some(isOpen)) ? ": one still has a step for you" : ""}`} open={older.some((p) => p.steps.some(isOpen))}>
      {older.map((p) => <More key={p.id} label={`Plan #${p.id} · ${status(p.status)}${p.steps.some(isOpen) ? " · has a step for you" : ""}`} open={p.steps.some(isOpen)}>
        <ProposalView p={p} send={send} busy={busy} old />
      </More>)}
    </More>}

    <StaffNotes orderRef={item.orderRef} notes={notes} zone={zone} send={send} busy={busy} />
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
  </>
  const cls = `case${item.todo.length ? " case-waiting" : ""}${quiet ? " case-quiet" : ""}${item.status === "urgent" ? " case-urgent" : ""}`
  if (!compact) return <article id={`case-${item.orderRef}`} className={cls}>{body}</article>
  const first = item.todo[0]
  return <details id={`case-${item.orderRef}`} className={`${cls} case-fold`}>
    <summary className="case-row">
      {title}
      <span className="case-next">{first ? <><b className={first.urgent ? "tone-danger" : undefined}>{first.urgent ? `Urgent: ${first.detail}` : first.action}</b></>
        : <span className="muted">{item.waitingOn.length ? "Waiting on others" : "Nothing to do"}</span>}</span>
      <span className="chips">{item.todo.length > 0 && <span className="chip-fact todo-count">{item.todo.length} to do</span>}{chips}</span>
    </summary>
    {body}
  </details>
}

/** Internal notes on the case: seen by colleagues and by the agent on its next run; sent to nobody. */
function StaffNotes({ orderRef, notes, zone, send, busy }: { orderRef: string; notes: AgentCase["timeline"]; zone?: string; send: Send; busy: boolean }) {
  const [text, setText] = useState("")
  return <div className="staff-notes">
    {notes.length > 0 && <ol className="case-timeline">{notes.map((n) => <li key={n.id}>
      <span className="muted num">{fmtDateTime(n.at, zone)}</span> <b>{n.actor}</b> <span className="msg-tag internal">Internal</span><p>{n.text}</p>
    </li>)}</ol>}
    <div className="decide">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Internal note for colleagues and the agent (sent to nobody)" aria-label="Internal note" />
      <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => send({ kind: "staff_note", order_ref: orderRef, text }, "Note saved").then(() => setText(""))}>Save note</button>
    </div>
  </div>
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

function ProposalView({ p, send, busy, old = false }: { p: AgentProposal; send: Send; busy: boolean; old?: boolean }) {
  const [note, setNote] = useState("")
  const [reason, setReason] = useState("")
  const [rejecting, setRejecting] = useState(false)
  const [simulate, setSimulate] = useState("")
  const plan = p.plan
  const kinds = new Set([...(plan?.steps ?? []), ...(plan?.options ?? []).flatMap((o) => o.steps ?? [])].map((s) => s.kind))
  const books = [...kinds].some((k) => k.startsWith("book_"))
  const options = plan?.options ?? []
  const [option, setOption] = useState(plan?.chosen || plan?.recommended || options[0]?.key || "")
  const decide = (extra: Record<string, unknown>, label: string) => send({ kind: "decide", proposal_id: p.id, decision: "approve", note, simulate, ...(option ? { option } : {}), ...extra }, label)
  const ran = p.steps.filter((s) => s.status !== "skipped"), skipped = p.steps.filter((s) => s.status === "skipped")
  const blocked = p.steps.some((s) => s.ref === "before_booking" && s.status === "waiting_for_person") // n8n refuses approval until the check is done
  const wait = blocked ? "needs the check above marked done first (greyed out until then)." : ""
  const banner = old && p.status === "executed" ? OLD_EXECUTED : BANNER[p.status]
  return <div className={`proposal${old ? " proposal-old" : ""}`} id={`plan-${p.id}`}>
    <div className="proposal-head"><b>{old ? "Older plan" : "Current plan"} #{p.id}</b><Chip tone={old ? "neutral" : TONE[p.status] ?? "neutral"}>{status(p.status)}</Chip>
      {plan && <span className="muted num">EUR {plan.total_eur ?? 0}{plan.option_id ? ` · ${plan.on_time ? `on time, ${plan.buffer_hours} h buffer` : `${plan.late_hours} h late`}` : ""}{plan.source === "mock_generated" ? " · simulated sailing" : ""}</span>}</div>
    {banner && <p className={`trigger-status tone-${old ? "neutral" : TONE[p.status] ?? "neutral"}`}>{banner}</p>}
    {p.summary && <p className="proposal-summary"><Skim text={p.summary} /></p>}
    {options.length > 0 && <table className="options-table">
      <thead><tr><th>Option</th><th>Arrives (buyer's local time)</th><th>Delivery window</th><th className="num">Total</th></tr></thead>
      <tbody>{options.map((o) => <tr key={o.key}>
        <td><label>{p.status === "pending" && <input type="radio" name={`opt-${p.id}`} checked={option === o.key} onChange={() => setOption(o.key)} />} <b>{o.key}</b> {o.names.join(" / ")}{o.key === plan?.recommended ? " (recommended)" : ""}{o.key === plan?.chosen ? " (chosen)" : ""}</label></td>
        <td>{o.arrives_local}</td><td>{o.on_time === false ? `${o.late_hours ?? "?"} h late` : "on time"}</td><td className="num">EUR {o.total_eur}</td>
      </tr>)}</tbody>
    </table>}
    {plan?.valid_until_local && <p className="proposal-why"><b>Offer valid until</b> {plan.valid_until_local} (buyer's local time). After that the agent makes a new offer.</p>}
    {(p.detail || p.rationale || !!plan?.alternatives?.length) && <More label="Why this plan, and the next best">
      {p.detail && <p className="proposal-detail"><Skim text={p.detail} /></p>}
      {p.rationale && <p className="proposal-why"><b>Why this plan.</b> <Skim text={p.rationale} /></p>}
      {plan?.alternatives && plan.alternatives.length > 0 && <p className="proposal-why"><b>Next best.</b> <Skim text={plan.alternatives.join(" · ")} /></p>}
    </More>}
    {p.evidence.length > 0 && <More label={`What the agent looked at (${p.evidence.length})`}><div className="chips">{p.evidence.map((e) => <span className="chip-fact mono" key={e}>{e}</span>)}</div></More>}
    {p.status !== "pending" && (p.decidedBy || p.result) && <p className="proposal-why"><b>Decided by</b> {p.decidedBy || "nobody yet"}{p.decisionNote ? `: “${p.decisionNote}”` : ""}{p.result ? `. ${short(p.result)}` : ""}</p>}

    {p.status === "pending" && plan && plan.steps.length > 0 && <>
      <p className="steps-head">What happens if you approve</p>
      {/* a line that already has its own step card below (a check before booking) is not repeated */}
      <ol className="steps">{plan.steps.map((s, k) => p.steps.some((step) => step.detail === s.detail) ? null : <PlanLineView key={k} line={s} index={k} proposalId={p.id} send={send} busy={busy} />)}</ol>
      <p className="muted small">{onApproval(plan.steps)}</p>
    </>}
    {ran.length > 0 && <ol className="steps">{ran.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol>}
    {skipped.length > 0 && <More label={`Steps that did not run (${skipped.length})`}><ol className="steps">{skipped.map((s) => <StepView key={s.id} s={s} send={send} busy={busy} />)}</ol></More>}

    {p.status === "pending" && (rejecting
      ? <div className="decide">
        <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you reject it? The agent uses your reason for its next plan (required)" aria-label="Reason for rejecting" />
        <button type="button" className="btn danger" disabled={busy || !reason.trim()} onClick={() => send({ kind: "decide", proposal_id: p.id, decision: "reject", note: reason }, `Reject plan #${p.id}`)}>Reject plan</button>
        <button type="button" className="btn" onClick={() => setRejecting(false)}>Cancel</button>
        <Help items={[["Reject plan", reason.trim() ? "nothing runs; the agent makes a new plan that avoids your reason." : "needs your reason first (greyed out until you type one)."]]} />
      </div>
      : <div className="decide">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the record (optional)" aria-label="Note for the record" />
        {plan?.needs_buyer
          ? <button type="button" className="btn primary" disabled={busy || blocked} onClick={() => decide({}, `Approve plan #${p.id}`)}>Approve and send to buyer</button>
          : <>
            <button type="button" className="btn primary" disabled={busy || blocked} onClick={() => decide({}, `Approve plan #${p.id}`)}>{books ? "Approve and book" : "Approve"}</button>
            {kinds.has("customer_message") && <button type="button" className="btn" disabled={busy || blocked} onClick={() => decide({ send: "ask_buyer" }, `Ask the buyer first, plan #${p.id}`)}>Approve, ask buyer first</button>}
          </>}
        <button type="button" className="btn" disabled={busy} onClick={() => setRejecting(true)}>Reject…</button>
        {books && <label className="small muted test-switch">Demo test <select value={simulate} onChange={(e) => setSimulate(e.target.value)} aria-label="Test a booking failure">
          <option value="">bookings succeed</option>
          {kinds.has("book_ferry") && <><option value="ferry_sold_out">ferry sells out</option><option value="ferry_timeout_once">ferry times out once</option></>}
          {kinds.has("book_hotel") && <option value="hotel_timeout">hotel times out</option>}
          {kinds.has("book_train") && <option value="train_sold_out">train sells out</option>}
          {kinds.has("book_flight") && <option value="flight_sold_out">flight sells out</option>}
        </select></label>}
        <Help items={[
          ...(plan?.needs_buyer ? [["Approve and send to buyer", wait || `sends the options to the buyer${options.length ? ` (option ${option} marked as recommended)` : ""}; nothing is booked until they choose.`] as [string, string]]
            : [[books ? "Approve and book" : "Approve", wait || `runs everything listed above now${books ? " (bookings are mock)" : ""}, including the messages.`] as [string, string],
              ...(kinds.has("customer_message") ? [["Approve, ask buyer first", wait || "sends only the buyer message now; books after the buyer agrees."] as [string, string]] : [])]),
          ["Reject…", "asks for your reason (required); nothing runs."],
          ["Note", "optional, kept on the record."],
        ]} />
      </div>)}
  </div>
}

/** One line of a plan waiting for approval. Messages to the buyer or delivery contact can be rewritten before approving. */
function PlanLineView({ line, index, proposalId, send, busy }: { line: PlanLine; index: number; proposalId: number; send: Send; busy: boolean }) {
  const draft = MESSAGE_KINDS.has(line.kind)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(line.detail)
  return <li className="agent-step">
    <div className="step-line"><b>{STEP_LABELS[line.kind] ?? words(line.kind)}</b>{draft && <Chip tone="accent">Draft, sent only after approval</Chip>}
      {line.edited_by && <span className="muted small">edited by {line.edited_by}</span>}{line.cost_cents > 0 && <span className="num">EUR {line.cost_cents / 100}</span>}</div>
    {editing
      ? <>
        <textarea className="draft-edit" rows={Math.min(14, Math.max(5, text.split("\n").length + 2))} value={text} onChange={(e) => setText(e.target.value)} aria-label="Message text" />
        <p className="muted small">The agent's fact check does not see your changes: check times and prices yourself. The buyer gets it translated to their language.</p>
        <div className="decide">
          <button type="button" className="btn primary" disabled={busy || !text.trim()} onClick={() => send({ kind: "edit_draft", proposal_id: proposalId, index, text }, "Message saved").then(() => setEditing(false))}>Save message</button>
          <button type="button" className="btn" onClick={() => { setText(line.detail); setEditing(false) }}>Cancel</button>
        </div>
      </>
      : draft ? <p className="draft-text">{line.detail}</p> : <div className="step-detail"><Folded text={line.detail} label="Show all" /></div>}
    {draft && !editing && <div className="decide"><button type="button" className="btn" disabled={busy} onClick={() => { setText(line.detail); setEditing(true) }}>Edit message</button></div>}
  </li>
}

const PERSON_STEPS = new Set(["customer_message", "buyer_decision", "staff_task"])
/** "If you approve: ..." from the plan's step kinds: bookings and records run (mock), people steps wait. */
function onApproval(steps: PlanLine[]) {
  const names = (keep: boolean) => [...new Set(steps.filter((s) => PERSON_STEPS.has(s.kind) === keep).map((s) => (STEP_LABELS[s.kind] ?? words(s.kind)).toLowerCase()))].join(", ")
  const auto = names(false), people = names(true)
  return `If you approve: ${auto ? `${auto} run at once (mock)` : "nothing runs by itself"}${people ? `; then waits for a person or the buyer: ${people}` : ""}.`
}

function StepView({ s, send, busy }: { s: AgentStep; send: Send; busy: boolean }) {
  const [note, setNote] = useState("")
  const [failing, setFailing] = useState(false)
  const [time, setTime] = useState("")
  const waiting = s.status === "waiting_for_person" && !s.stale
  const answer = s.kind === "buyer_decision" // the buyer's answer is what wakes the agent
  const ask = (s.note.match(/\[ask_time (ready|handover)\]/) ?? [])[1] // the agent asked for a time: date-time field, or not known yet
  // Step 0 of a new plan: "updated offer follows" notice for a buyer whose open offer was replaced (propose_action); done = the bot sends it.
  const holding = s.kind === "customer_message" && s.no === 0 && s.proposalId > 0
  const who = s.kind === "customer_message" ? "buyer" : s.kind === "notify_driver" ? "driver" : "delivery contact"
  const title = s.reminder ? `Reminder ${s.no || ""} to the ${who}` : holding ? "Notice to the buyer: an updated offer is coming" : s.label
  const tag = s.ref === "before_booking" ? "Do this before approving" : s.kind === "staff_task" && s.proposalId === 0 && s.ref ? `${s.ref} priority` : s.ref
  const fail = () => send({ kind: "step", step_id: s.id, outcome: "failed", note }, `${title}: could not be done`)
  return <li className={`agent-step${waiting ? " step-yours" : ""}`} id={`step-${s.id}`}>
    <div className="step-line"><Chip tone={s.superseded || s.stale ? "neutral" : TONE[s.status] ?? "neutral"}>{s.superseded ? "Replaced by a later booking" : s.stale ? "No longer needed" : status(s.status)}</Chip>
      <b>{title}</b>{tag && <span className="mono muted">{tag}</span>}{s.costCents ? <span className="num">EUR {s.costCents / 100}</span> : null}{s.attempts > 1 && <span className="muted">{s.attempts} tries</span>}</div>
    <div className="step-detail"><Folded text={s.detail} label="Show all" /></div>
    {s.note && <p className="muted small"><Skim text={s.note} /></p>}

    {waiting && (holding || s.reminder) && <div className="decide">
      <button type="button" className="btn primary" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "done", note: holding ? "updated-offer notice approved" : "reminder approved" }, holding ? "Notice sent to the buyer" : "Reminder sent")}>{holding ? "Send notice" : "Send reminder"}</button>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "failed", note: holding ? "updated-offer notice not sent (staff choice)" : "reminder not sent (staff choice)" }, "Not sent")}>Don't send</button>
      <Help items={[[holding ? "Send notice" : "Send reminder", "the bot sends the text above on Telegram now."], ["Don't send", "nothing is sent; the step is closed."]]} />
    </div>}

    {waiting && !holding && !s.reminder && (failing
      ? <div className="decide">
        <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why can't it be done? The agent uses this to re-plan (required)" aria-label="Why it could not be done" />
        <button type="button" className="btn danger" disabled={busy || !note.trim()} onClick={fail}>Can't be done</button>
        <button type="button" className="btn" onClick={() => setFailing(false)}>Cancel</button>
        <Help items={[["Can't be done", note.trim() ? "closes this step; the agent uses your reason to re-plan." : "needs your reason first (greyed out until you type one)."]]} />
      </div>
      : <>
        {ask && <div className="decide">
          <label className="small">{ask === "ready" ? "Car ready at" : "Driver can start driving at"} <input type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" /></label>
          <span className="muted small">Leave empty if not known yet: you are asked again later and nothing is rebooked meanwhile.</span>
        </div>}
        <div className="decide">
          {(answer || s.kind === "staff_task") && <input value={note} onChange={(e) => setNote(e.target.value)}
            placeholder={answer ? "What the buyer said, e.g. \"accepts option B\" (required)" : "What you did or found (optional)"} aria-label={answer ? "Buyer's answer" : "What you did"} />}
          <button type="button" className="btn primary" disabled={busy || (answer && !note.trim())} onClick={() => send({ kind: "step", step_id: s.id, outcome: "done", note, ...(ask && time ? { time: new Date(time).toISOString() } : {}) }, `${title}: done`)}>{MESSAGE_KINDS.has(s.kind) ? "I sent it" : answer ? "Record answer" : "Mark done"}</button>
          {!answer && <button type="button" className="btn" disabled={busy} onClick={() => setFailing(true)}>Can't do it…</button>}
          <Help items={[
            MESSAGE_KINDS.has(s.kind) ? ["I sent it", "press after you sent the message yourself; the bot sends nothing."]
              : answer ? ["Record answer", note.trim() ? "saves the buyer's answer and wakes the agent." : "needs the buyer's answer typed in first (greyed out until then)."]
              : ["Mark done", "press after you did it; the note is optional."],
            ...(answer ? [] : [["Can't do it…", "asks for your reason (required); the agent re-plans."] as [string, string]]),
          ]} />
        </div>
      </>)}

    {s.status === "failed" && s.kind === "book_hotel" && !s.superseded && <div className="decide">
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "step", step_id: s.id, outcome: "retry" }, `${title}: retry`)}>Retry booking</button>
    </div>}

    {s.kind === "staff_task" && s.proposalId === 0 && waiting && !failing && <div className="decide">
      <span className="muted small">Or ask the agent for a plan (you approve it):</span>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "replacement", note }, "Replacement driver requested")}>Replacement driver</button>
      <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "cancel", note }, "Cancellation plan requested")}>Cancel the delivery</button>
      {s.ref !== "urgent" && <button type="button" className="btn" disabled={busy} onClick={() => send({ kind: "task_action", step_id: s.id, action: "urgent", note }, "Marked urgent")}>Mark urgent</button>}
    </div>}
  </li>
}
