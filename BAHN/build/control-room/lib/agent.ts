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
  reminder: boolean }
export type PlanLine = { kind: string; detail: string; cost_cents: number }
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
  needsPerson: string[]; proposals: AgentProposal[]; timeline: AgentLine[]; messages: AgentMessage[]
  /** Urgent staff tasks from escalate_urgent; they need no approval. */
  escalations: AgentStep[]
  /** Problem workflows the router put on the case (latest routing). */
  workflows: string[]
  /** The agent's latest run report, when it is the newest thing on the case. */
  report: AgentLine | null
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
const parse = (value: unknown): Record<string, unknown> => { try { const out = JSON.parse(str(value)); return out && typeof out === "object" ? out : {} } catch { return {} } }

export async function loadAgentCases(): Promise<AgentCase[]> {
  const [cases, timeline, proposals, steps, messages] = await Promise.all(["otr_cases", "otr_timeline", "otr_proposals", "otr_plan_steps", "otr_messages"].map(rows))
  const refs = new Set([...cases, ...proposals, ...timeline].map((row) => str(row.order_ref)).filter(Boolean))
  return [...refs].map((orderRef) => {
    const caseRow = cases.filter((row) => row.order_ref === orderRef).at(-1)
    const orderSteps = steps.filter((row) => row.order_ref === orderRef)
    // Same rule as the n8n close gate: a failed booking stops counting once a later plan booked the same kind.
    const rebooked = (row: N8nRow) => /^book_/.test(str(row.kind)) && orderSteps.some((q) => q.kind === row.kind && q.status === "done" && q.id > row.id)
    const orderProposals = proposals.filter((row) => row.order_ref === orderRef)
    const planLines = new Map(orderProposals.map((row) => [row.id, (parse(parse(row.payload).detail).steps ?? []) as PlanLine[]]))
    const stepViews: AgentStep[] = orderSteps.map((row) => ({
      id: row.id, proposalId: Number(row.proposal_id) || 0, no: Number(str(row.step_no).replace(/^R/, "")) || 0, kind: str(row.kind), label: STEP_LABELS[str(row.kind)] ?? str(row.kind),
      detail: str(row.detail), status: str(row.status), ref: str(row.ref), attempts: Number(row.attempts) || 0, note: str(row.note), updatedBy: str(row.updated_by),
      superseded: row.status === "failed" && rebooked(row),
      costCents: planLines.get(Number(row.proposal_id))?.[Number(row.step_no) - 1]?.cost_cents ?? null,
      reminder: /^R\d+$/.test(str(row.step_no)),
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
    const needsPerson = [...new Set([
      ...(urgent ? [openUrgent?.note.startsWith("Urgent") ? openUrgent.note : `Urgent: ${str(caseRow?.summary).replace(/^URGENT: /, "")}`] : []),
      ...proposalViews.filter((p) => p.status === "pending").map((p) => `${p.label} #${p.id} waits for approval`),
      ...stepViews.filter((s) => s.status === "waiting_for_person").map((s) => `${s.label} waits for a person`),
      ...stepViews.filter((s) => s.status === "failed" && !s.superseded).map((s) => `${s.label} failed`),
      ...(caseRow?.status === "needs_decision" && !pending ? ["Case needs a decision"] : []),
      ...(report && !pending && caseRow?.status !== "closed_by_agent" ? ["The agent's last run asks for your call; read its report"] : []),
    ])]
    return {
      orderRef, status: urgent ? "urgent" : str(caseRow?.status) || "open", owner: str(caseRow?.owner), summary: str(caseRow?.summary),
      needsPerson, proposals: proposalViews,
      timeline: lines, report,
      messages: messages.filter((row) => row.order_ref === orderRef).map((row) => ({ id: row.id, role: str(row.role), direction: str(row.direction), kind: str(row.kind), text: str(row.text), status: str(row.status), at: row.createdAt })).sort((a, b) => a.id - b.id),
      escalations: stepViews.filter((step) => step.proposalId === 0),
      workflows: route ? route.ref.replace(/^route:/, "").split(",").filter(Boolean) : [],
      updatedAt: [caseRow?.updatedAt, lines[0]?.at, ...proposals.filter((row) => row.order_ref === orderRef).map((row) => row.updatedAt)].filter(Boolean).sort().at(-1) ?? "",
    }
  }).sort((a, b) => Number(b.status === "urgent") - Number(a.status === "urgent") || b.needsPerson.length - a.needsPerson.length || b.updatedAt.localeCompare(a.updatedAt))
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
    return call("/webhook/bahn/act", { method: "POST", body: JSON.stringify({
      proposal_id: Number(input.proposal_id), decision: input.decision, operator, note, ...(input.simulate ? { simulate: input.simulate } : {}),
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
    return call("/webhook/bahn/step", { method: "POST", body: JSON.stringify({ step_id: Number(input.step_id), outcome: input.outcome, operator, note, ...(time ? { time } : {}) }) })
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
