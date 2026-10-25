import "server-only"

import { ACTION_LABELS, AREAS, STEP_LABELS } from "./areas"

// Agent state lives in the n8n Data Tables the area agents write (BAHN/build/n8n). This file reads them
// and forwards a person's decisions to the shared n8n webhooks. The browser never talks to n8n directly.

const N8N = process.env.N8N_API_URL ?? "http://127.0.0.1:5678"
export const OPERATOR = process.env.CONTROL_ROOM_OPERATOR ?? "ops (control room)"
// Test-only switches: booking failures on approve, and a driver who does not answer on an event.
const SIMULATE = ["ferry_sold_out", "ferry_timeout_once", "hotel_timeout", "train_sold_out", "flight_sold_out"]
const EVENT_SIMULATE = ["driver_unreachable"]

type N8nRow = Record<string, unknown> & { id: number; createdAt: string; updatedAt: string }

/** proposalId 0 = an urgent staff task from escalate_urgent (no approval step). costCents comes from the approved plan line. */
export type AgentStep = { id: number; proposalId: number; no: number; kind: string; label: string; detail: string; status: string; ref: string; attempts: number; note: string; updatedBy: string; superseded: boolean; costCents: number | null
  /** A reminder draft (step R1, R2) from otr_reminders; marking it done sends it. */
  reminder: boolean
  /** Still marked waiting, but its plan was replaced, expired, rejected or declined: nothing to do. */
  stale: boolean }
const DEAD_PLAN = ["replaced", "expired", "rejected", "declined"]
export type PlanLine = { kind: string; detail: string; cost_cents: number; edited_by?: string }
/** action: the bold "what to do"; detail: one short line of context. */
export type Todo = { action: string; detail?: string; anchor: string; urgent?: boolean }
export type PlanOption = { key: string; names: string[]; arrives_local: string; on_time?: boolean; late_hours?: number; total_eur: number; steps: PlanLine[] }
export type AgentProposal = {
  id: number; action: string; label: string; status: string; summary: string; detail: string
  plan: { steps: PlanLine[]; total_eur?: number; option_id?: string; on_time?: boolean; late_hours?: number; buffer_hours?: number; source?: string; alternatives?: string[]
    options?: PlanOption[]; recommended?: string; chosen?: string; needs_buyer?: boolean; valid_until_local?: string } | null
  rationale: string; evidence: string[]; decidedBy: string; decisionNote: string; result: string; createdAt: string; steps: AgentStep[]
}
export type AgentLine = { id: number; actor: string; kind: string; text: string; ref: string; at: string }
/** One Telegram message on the order (buyer, delivery contact, driver, staff ping); chat ids are not exposed. */
export type AgentMessage = { id: number; role: string; direction: string; kind: string; text: string; status: string; at: string }
export type AgentCase = {
  orderRef: string; status: string; owner: string; summary: string; updatedAt: string
  /** What a person must do now; anchor is the element id of the step or plan that does it. */
  todo: Todo[]
  /** What the case waits for from others (buyer, the agent, a colleague); nothing for this person to do. */
  waitingOn: string[]
  proposals: AgentProposal[]; timeline: AgentLine[]; messages: AgentMessage[]
  /** Urgent staff tasks from escalate_urgent; they need no approval. */
  escalations: AgentStep[]
  /** Problem workflows the router put on the case (latest routing). */
  workflows: string[]
  /** The agent's latest run report, when it is the newest thing on the case. */
  report: AgentLine | null
  /** Staff who left their name on a decision, step or note on this order (each once, oldest first). */
  handledBy: string[]
  /** The staff member whose name is on the newest such record. */
  lastHandler: string
}

// Names the system writes in decided_by, updated_by and actor columns: not people.
const NOT_STAFF = /^(|ops|agent|router|follow_up|control_room|alert|telegram|system|act workflow|propose_action|reminders|ops \(control room\)|buyer via telegram)$|\(simulated|workflow|^driver\b/i
/** Staff names on one order, from the records n8n and the control room already write; no extra table. */
function staffTouches(orderRef: string, proposals: N8nRow[], steps: N8nRow[], timeline: N8nRow[]): { name: string; at: string }[] {
  const out: { name: string; at: string }[] = []
  const add = (raw: unknown, at: string) => { const name = str(raw).replace(/^operator\s+/i, "").trim(); if (name && !NOT_STAFF.test(name)) out.push({ name, at }) }
  for (const row of proposals) add(row.decided_by, row.updatedAt)
  for (const row of steps) add(row.updated_by, row.updatedAt)
  for (const row of timeline) { const actor = str(row.actor); add(actor.match(/^staff \((.+)\)$/)?.[1] ?? (/^operator\s/i.test(actor) ? actor : ""), row.createdAt) }
  return out.sort((a, b) => a.at.localeCompare(b.at))
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const key = process.env.N8N_API_KEY
  if (!key) throw new Error("N8N_API_KEY is not set for the control room")
  const response = await fetch(N8N + path, { ...init, cache: "no-store", headers: { "X-N8N-API-KEY": key, "Content-Type": "application/json" } })
  const text = await response.text()
  if (!response.ok) throw new Error(`n8n ${path.split("?")[0]} answered ${response.status}: ${text.slice(0, 200)}`)
  return text ? JSON.parse(text) : {}
}

// ponytail: table ids are looked up once per server process; restart the site after re-running setup.mjs.
let tableIds: Promise<Map<string, string>> | null = null
async function tableId(name: string): Promise<string> {
  tableIds ??= (call("/api/v1/data-tables?limit=100") as Promise<{ data: { id: string; name: string }[] }>)
    .then((result) => new Map(result.data.map((table) => [table.name, table.id])))
    .catch((cause) => { tableIds = null; throw cause })
  const id = (await tableIds).get(name)
  if (!id) throw new Error(`n8n has no Data Table named ${name}; run BAHN/build/n8n/setup.mjs`)
  return id
}
async function rows(name: string): Promise<N8nRow[]> {
  const id = await tableId(name)
  const all: N8nRow[] = []
  let cursor: string | null = null
  do {
    const page = await call(`/api/v1/data-tables/${id}/rows?limit=250${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`) as { data: N8nRow[]; nextCursor: string | null }
    all.push(...page.data)
    cursor = page.nextCursor
  } while (cursor)
  return all
}

const str = (value: unknown) => value == null ? "" : String(value)
const short = (text: string, n = 120) => { const one = text.replace(/\s+/g, " ").trim(); return one.length > n ? `${one.slice(0, n - 1).trimEnd()}…` : one }
const parse = (value: unknown): Record<string, unknown> => { try { const out = JSON.parse(str(value)); return out && typeof out === "object" ? out : {} } catch { return {} } }

export async function loadAgentCases(): Promise<AgentCase[]> {
  const [cases, timeline, proposals, steps, messages] = await Promise.all(["otr_cases", "otr_timeline", "otr_proposals", "otr_plan_steps", "otr_messages"].map(rows))
  const refs = new Set([...cases, ...proposals, ...timeline].map((row) => str(row.order_ref)).filter((ref) => /^CD-\d+$/.test(ref)))
  return [...refs].map((orderRef) => {
    const caseRow = cases.filter((row) => row.order_ref === orderRef).at(-1)
    const orderSteps = steps.filter((row) => row.order_ref === orderRef)
    // Same rule as the n8n close gate: a failed booking stops counting once a later plan booked the same kind.
    const rebooked = (row: N8nRow) => /^book_/.test(str(row.kind)) && orderSteps.some((q) => q.kind === row.kind && q.status === "done" && q.id > row.id)
    const orderProposals = proposals.filter((row) => row.order_ref === orderRef)
    const planLines = new Map(orderProposals.map((row) => [row.id, (parse(parse(row.payload).detail).steps ?? []) as PlanLine[]]))
    // A step still "waiting" on a plan that was replaced, expired, rejected or declined can no longer do anything.
    const deadPlans = new Set(orderProposals.filter((row) => DEAD_PLAN.includes(str(row.status))).map((row) => row.id))
    const stepViews: AgentStep[] = orderSteps.map((row) => ({
      id: row.id, proposalId: Number(row.proposal_id) || 0, no: Number(str(row.step_no).replace(/^R/, "")) || 0, kind: str(row.kind), label: STEP_LABELS[str(row.kind)] ?? str(row.kind),
      detail: str(row.detail), status: str(row.status), ref: str(row.ref), attempts: Number(row.attempts) || 0, note: str(row.note), updatedBy: str(row.updated_by),
      superseded: row.status === "failed" && rebooked(row),
      costCents: planLines.get(Number(row.proposal_id))?.[Number(row.step_no) - 1]?.cost_cents ?? null,
      reminder: /^R\d+$/.test(str(row.step_no)),
      stale: row.status === "waiting_for_person" && deadPlans.has(Number(row.proposal_id)),
    })).sort((a, b) => a.proposalId - b.proposalId || a.no - b.no)
    const proposalViews: AgentProposal[] = orderProposals.map((row) => {
      const payload = parse(row.payload)
      const plan = parse(payload.detail)
      const isPlan = Array.isArray(plan.steps)
      return {
        id: row.id, action: str(row.action), label: ACTION_LABELS[str(row.action)] ?? str(row.action), status: str(row.status),
        summary: str(payload.summary), detail: isPlan ? "" : str(payload.detail), plan: isPlan ? plan as AgentProposal["plan"] : null,
        rationale: str(row.rationale), // Split at commas and semicolons outside brackets, so "timeline (events #64, #65)" stays one tag.
        evidence: [...new Set(str(row.evidence_refs).split(/[,;](?![^()]*\))/).map((e) => e.trim()).filter(Boolean))],
        decidedBy: str(row.decided_by), decisionNote: str(row.decision_note), result: str(row.result), createdAt: row.createdAt,
        steps: stepViews.filter((step) => step.proposalId === row.id),
      }
    }).sort((a, b) => b.id - a.id)
    const lines: AgentLine[] = timeline.filter((row) => row.order_ref === orderRef)
      .map((row) => ({ id: row.id, actor: str(row.actor), kind: str(row.kind), text: str(row.text), ref: str(row.source_ref), at: row.createdAt })).sort((a, b) => b.id - a.id)
    const route = lines.find((line) => line.kind === "route")
    const report = lines[0]?.kind === "run_report" ? lines[0] : null
    const pending = proposalViews.some((p) => p.status === "pending")
    // An open urgent task keeps the case urgent even after a later plan sets the status to needs_decision.
    // Tasks (proposal_id "task") carry their priority in ref (urgent | top | normal); normal tasks and reminder drafts are not urgent.
    const openUrgent = stepViews.find((s) => s.proposalId === 0 && s.kind === "staff_task" && s.ref !== "normal" && s.status === "waiting_for_person")
    const urgent = caseRow?.status === "urgent" || !!openUrgent
    // What a person must do now, in plain words, each pointing at the button that does it. Waiting on others is listed apart.
    const newest = proposalViews[0]
    const older = (s: AgentStep) => !!newest && s.proposalId > 0 && s.proposalId < newest.id
    const planOf = (s: AgentStep) => s.proposalId ? ` (plan #${s.proposalId}${older(s) ? ", an older plan" : ""})` : ""
    const todo: Todo[] = []
    const waitingOn: string[] = []
    if (urgent) todo.push({ urgent: true, anchor: openUrgent ? `step-${openUrgent.id}` : `case-${orderRef}`, action: "Urgent: do this first",
      detail: short((openUrgent?.note.startsWith("Urgent") ? openUrgent.note : openUrgent?.detail || str(caseRow?.summary)).replace(/^urgent:\s*/i, "")) })
    for (const p of proposalViews.filter((p) => p.status === "pending")) {
      const check = p.steps.find((s) => s.ref === "before_booking" && s.status === "waiting_for_person")
      todo.push(check ? { anchor: `step-${check.id}`, action: `Check, then approve or reject plan #${p.id}`, detail: short(check.detail) }
        : { anchor: `plan-${p.id}`, action: `Approve or reject plan #${p.id}`, detail: short(p.summary) })
    }
    // Tasks left open on plans older than the newest: one line, not one per task (test runs leave many near-copies).
    const leftovers = stepViews.filter((s) => s.status === "waiting_for_person" && !s.stale && older(s))
    if (leftovers.length) todo.push({ anchor: `step-${leftovers[0].id}`, ...(leftovers.length === 1
      ? { action: `Finish the task left on older plan #${leftovers[0].proposalId}`, detail: short(leftovers[0].detail) }
      : { action: `Finish ${leftovers.length} tasks left on older plans`, detail: `Plans #${[...new Set(leftovers.map((s) => s.proposalId))].join(", #")}. Mark each done, or "can't be done" if no longer needed.` }) })
    for (const s of stepViews.filter((s) => s.status === "waiting_for_person" && s !== openUrgent && !s.stale && !leftovers.includes(s))) {
      const anchor = `step-${s.id}`
      const who = s.kind === "customer_message" ? "buyer" : s.kind === "notify_driver" ? "driver" : "delivery contact"
      if (s.ref === "before_booking") { if (!proposalViews.some((p) => p.id === s.proposalId && p.status === "pending")) todo.push({ anchor, action: "Check before booking", detail: short(s.detail) }) }
      else if (s.kind === "buyer_decision") {
        const until = proposalViews.find((p) => p.id === s.proposalId)?.plan?.valid_until_local
        waitingOn.push(`The buyer's answer to plan #${s.proposalId}${until ? ` (offer valid until ${until}, buyer's time)` : ""}. If they answered by phone or email, record it on the plan.`)
      } else if (s.reminder) todo.push({ anchor, action: `Send or skip reminder to the ${who}` })
      else if (s.kind === "customer_message" && s.no === 0 && s.proposalId > 0) todo.push({ anchor, action: "Send or skip notice to the buyer", detail: `"An updated offer is coming"` })
      else if (s.kind === "customer_message" || s.kind === "delivery_contact_message") todo.push({ anchor, action: `Send the message to the ${who}`, detail: `Plan #${s.proposalId}. Send it yourself, then press "I sent it".` })
      else if (s.kind === "staff_task") todo.push({ anchor, action: `Do task${planOf(s)}`, detail: short(s.detail) })
      else todo.push({ anchor, action: `${s.label}${planOf(s)}` })
    }
    // A failed booking is the agent's to re-plan; only a hotel can be retried by a person. Once a newer plan exists the failure is history.
    for (const s of stepViews.filter((s) => s.status === "failed" && !s.superseded && /^book_/.test(s.kind) && !older(s))) {
      if (s.kind === "book_hotel") todo.push({ anchor: `step-${s.id}`, action: `Retry the failed hotel booking (plan #${s.proposalId})`, detail: "Or wait for the agent's new plan." })
      else waitingOn.push(`The agent's new plan: ${s.label.toLowerCase()} failed on plan #${s.proposalId}.`)
    }
    for (const p of proposalViews.filter((p) => p.status === "deciding")) waitingOn.push(`Someone is deciding plan #${p.id} right now.`)
    if (!todo.length && caseRow?.status === "needs_decision" && !pending) todo.push({ anchor: `note-${orderRef}`, action: "Decide: the agent asks you", detail: "Read its latest note." })
    if (!todo.length && !waitingOn.length && report && !["closed_by_agent", "in_progress", "waiting_on_person"].includes(str(caseRow?.status)))
      todo.push({ anchor: `note-${orderRef}`, action: "Read the agent's latest note", detail: "It may ask you something." })
    const touches = staffTouches(orderRef, orderProposals, orderSteps, timeline.filter((row) => row.order_ref === orderRef))
    return {
      handledBy: [...new Map(touches.map((t) => [t.name.toLowerCase(), t.name])).values()], lastHandler: touches.at(-1)?.name ?? "",
      orderRef, status: urgent ? "urgent" : str(caseRow?.status) || "open", owner: str(caseRow?.owner), summary: str(caseRow?.summary),
      todo, waitingOn, proposals: proposalViews,
      timeline: lines, report,
      messages: messages.filter((row) => row.order_ref === orderRef).map((row) => ({ id: row.id, role: str(row.role), direction: str(row.direction), kind: str(row.kind), text: str(row.text), status: str(row.status), at: row.createdAt })).sort((a, b) => a.id - b.id),
      escalations: stepViews.filter((step) => step.proposalId === 0),
      workflows: route ? route.ref.replace(/^route:/, "").split(",").filter(Boolean) : [],
      updatedAt: [caseRow?.updatedAt, lines[0]?.at, ...proposals.filter((row) => row.order_ref === orderRef).map((row) => row.updatedAt)].filter(Boolean).sort().at(-1) ?? "",
    }
  }).sort((a, b) => Number(b.status === "urgent") - Number(a.status === "urgent") || Number(b.todo.length > 0) - Number(a.todo.length > 0) || b.updatedAt.localeCompare(a.updatedAt)) // a long to-do list is not more urgent
}

/** Incoming Telegram messages the bot could not link to an order (staff were asked "which order?"). */
export type UnlinkedMessage = { id: number; text: string; at: string }
const LINK_ROLES: Record<string, string> = { buyer: "Buyer", driver: "Driver", delivery_contact: "Delivery contact" }
export async function loadUnlinked(): Promise<UnlinkedMessage[]> {
  return (await rows("otr_messages")).filter((row) => row.direction === "in" && !str(row.order_ref))
    .map((row) => ({ id: row.id, text: str(row.text), at: row.createdAt })).sort((a, b) => b.id - a.id)
}

/** A person's command, checked here and carried out by n8n. */
export async function runCommand(input: Record<string, unknown>): Promise<unknown> {
  const note = str(input.note).slice(0, 1000)
  // The person's own name (typed once in the control room) goes on every decision; the env default is the fallback.
  const operator = str(input.operator).trim().slice(0, 60) || OPERATOR
  if (input.kind === "decide") {
    if (!["approve", "reject"].includes(str(input.decision))) throw new Error("decision must be approve or reject")
    if (input.simulate && !SIMULATE.includes(str(input.simulate))) throw new Error("unknown test failure")
    if (input.option && !/^[A-Z]$/.test(str(input.option))) throw new Error("option must be a letter")
    if (input.send && input.send !== "ask_buyer") throw new Error("send must be ask_buyer")
    if (input.decision === "reject" && !note.trim()) throw new Error("write why you reject the plan; the agent uses it to make a better one")
    return call("/webhook/bahn/act", { method: "POST", body: JSON.stringify({
      proposal_id: Number(input.proposal_id), decision: input.decision, operator, note, ...(input.simulate ? { simulate: input.simulate } : {}),
      ...(input.confirm_unclear === true ? { confirm_unclear: true } : {}),
      ...(input.option ? { option: input.option } : {}), ...(input.send ? { send: input.send } : {}),
    }) })
  }
  if (input.kind === "driver_message") {
    if (!/^CD-\d+$/.test(str(input.order_ref)) || !str(input.text).trim()) throw new Error("order reference and message text are required")
    return call("/webhook/bahn/message-driver", { method: "POST", body: JSON.stringify({ order_ref: input.order_ref, text: str(input.text).slice(0, 2000), operator }) })
  }
  if (input.kind === "link_message") {
    // "Which order?": a Telegram message the bot could not link. Staff name the order and the sender's role; the agent wakes on that order.
    const role = str(input.role)
    if (!/^CD-\d+$/.test(str(input.order_ref)) || !LINK_ROLES[role]) throw new Error("order reference and who wrote (buyer, driver or delivery contact) are required")
    const message = (await loadUnlinked()).find((m) => m.id === Number(input.message_id))
    if (!message) throw new Error("this message is already linked to an order; reload the page")
    await call(`/api/v1/data-tables/${await tableId("otr_messages")}/rows/update`, { method: "PATCH", body: JSON.stringify({
      filter: { type: "and", filters: [{ columnName: "id", condition: "eq", value: message.id }] }, data: { order_ref: input.order_ref, role } }) })
    // ponytail: goes through the router as a general event, not tg_inbound's buyer-answer reading; add a tg_inbound replay if buyer offers arrive unlinked.
    return call(AREAS[0].webhook, { method: "POST", body: JSON.stringify({ order_ref: input.order_ref, source: "telegram",
      event: `${LINK_ROLES[role]} wrote on Telegram (linked to this order by ${operator}): ${message.text.slice(0, 2000)}` }) })
  }
  if (input.kind === "step") {
    if (!["done", "failed", "retry"].includes(str(input.outcome))) throw new Error("outcome must be done, failed or retry")
    const time = str(input.time)
    if (time && Number.isNaN(Date.parse(time))) throw new Error("time must be a date and time")
    if (input.outcome === "failed" && !note.trim()) throw new Error("write why it could not be done")
    return call("/webhook/bahn/step", { method: "POST", body: JSON.stringify({ step_id: Number(input.step_id), outcome: input.outcome, operator, note, ...(time ? { time } : {}),
      ...(input.confirm_unclear === true ? { confirm_unclear: true } : {}) }) })
  }
  if (input.kind === "edit_draft") {
    // Staff rewrite a buyer or delivery-contact draft inside a plan that still waits for approval. The act workflow sends the plan line's text as it is then.
    const text = str(input.text).trim().slice(0, 4000)
    if (!text) throw new Error("the message cannot be empty")
    const row = (await rows("otr_proposals")).find((r) => r.id === Number(input.proposal_id))
    if (!row || row.status !== "pending") throw new Error("this plan is no longer waiting for approval; reload the page")
    const payload = parse(row.payload), plan = parse(payload.detail)
    const line = (plan.steps as PlanLine[] | undefined)?.[Number(input.index)]
    if (!line || !["customer_message", "delivery_contact_message"].includes(line.kind)) throw new Error("only messages to the buyer or delivery contact can be edited")
    Object.assign(line, { detail: text, edited_by: operator })
    return call(`/api/v1/data-tables/${await tableId("otr_proposals")}/rows/update`, { method: "PATCH", body: JSON.stringify({
      filter: { type: "and", filters: [{ columnName: "id", condition: "eq", value: row.id }, { columnName: "status", condition: "eq", value: "pending" }] },
      data: { payload: JSON.stringify({ ...payload, detail: JSON.stringify(plan) }) } }) })
  }
  if (input.kind === "staff_note") {
    // Internal note on the case: for colleagues, and read by the agent on its next run. Sent to nobody; does not wake the agent.
    const text = str(input.text).trim().slice(0, 2000)
    if (!/^CD-\d+$/.test(str(input.order_ref)) || !text) throw new Error("order reference and note text are required")
    return call(`/api/v1/data-tables/${await tableId("otr_timeline")}/rows`, { method: "POST", body: JSON.stringify({
      data: [{ order_ref: input.order_ref, actor: `staff (${operator})`, kind: "staff_note", text, source_ref: "" }] }) })
  }
  if (input.kind === "task_action") {
    // Incident task buttons. Urgent only raises the task's priority; replacement / cancel wake the agent, which files a plan a person approves.
    const step = (await rows("otr_plan_steps")).find((row) => row.id === Number(input.step_id) && str(row.proposal_id) === "task")
    if (!step) throw new Error("this staff task no longer exists; reload the page")
    if (input.action === "urgent") return call(`/api/v1/data-tables/${await tableId("otr_plan_steps")}/rows/update`, { method: "PATCH", body: JSON.stringify({
      filter: { type: "and", filters: [{ columnName: "id", condition: "eq", value: step.id }] }, data: { ref: "urgent", updated_by: operator } }) })
    const ask = { replacement: "find a replacement driver for this order and plan the handover", cancel: "plan cancelling this delivery (driver, car location, buyer draft)" }[str(input.action)]
    if (!ask) throw new Error("action must be replacement, cancel or urgent")
    return call(AREAS[0].webhook, { method: "POST", body: JSON.stringify({ order_ref: step.order_ref, source: "control_room",
      event: `Staff (${operator}) on the task "${str(step.detail).slice(0, 300)}": ${ask}.${note ? ` Note: ${note}` : ""}` }) })
  }
  if (input.kind === "event") {
    const area = AREAS.find((item) => item.id === input.area)
    if (!area) throw new Error("unknown area")
    if (!/^CD-\d+$/.test(str(input.order_ref)) || !str(input.event).trim()) throw new Error("order reference and event text are required")
    if (input.simulate && !EVENT_SIMULATE.includes(str(input.simulate))) throw new Error("unknown test switch")
    // Test: the text arrives as the order's driver writing on Telegram (simulated people bot, then tg_inbound), not as an alert.
    if (input.as === "driver") return call("/webhook/bahn/driver-report", { method: "POST", body: JSON.stringify({ order_ref: input.order_ref, text: str(input.event).slice(0, 2000) }) })
    return call(area.webhook, { method: "POST", body: JSON.stringify({ order_ref: input.order_ref, source: "control_room", event: str(input.event).slice(0, 2000), ...(input.simulate ? { simulate: input.simulate } : {}) }) })
  }
  throw new Error("unknown command")
}

/** Tunable numbers the agent reads (otr_settings). All are placeholders Bahn changes here; setup.mjs never overwrites them. */
export type Setting = { key: string; value: string; unit: string; section: string; description: string }

export async function loadSettings(): Promise<Setting[]> {
  return (await rows("otr_settings")).map((row) => ({ key: str(row.key), value: str(row.value), unit: str(row.unit), section: str(row.section), description: str(row.description) }))
}

export async function saveSetting(key: string, value: string): Promise<Setting> {
  const current = (await loadSettings()).find((setting) => setting.key === key)
  if (!current) throw new Error(`unknown setting ${key}`)
  const next = value.trim().slice(0, 200)
  // Same type rules the agent applies when it reads them: numbers stay numbers, switches are on/off.
  if (current.unit === "on/off" && !["on", "off"].includes(next)) throw new Error("use on or off")
  if (/^(min|h|s|km\/h|EUR|DKK|tries|times|x|0-1)$/.test(current.unit) && (next === "" || Number.isNaN(Number(next)) || Number(next) < 0)) throw new Error(`${key} must be a number of ${current.unit}`)
  if (current.unit === "0-1" && Number(next) > 1) throw new Error("thresholds are between 0 and 1")
  await call(`/api/v1/data-tables/${await tableId("otr_settings")}/rows/update`, { method: "PATCH", body: JSON.stringify({
    filter: { type: "and", filters: [{ columnName: "key", condition: "eq", value: key }] }, data: { value: next } }) })
  return { ...current, value: next }
}
