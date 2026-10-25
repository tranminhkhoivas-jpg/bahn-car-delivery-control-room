# F-012 - Bahn control room site (Needs a person queue)

- **Scope:** Bahn only
- **Status:** working
- **Built by:** claude-opus-5-5 via Claude Code, 2026-10-24
- **Last edited by:** claude-opus-5-5 via Claude Code, 2026-10-25 (incident task buttons; one-click updated-offer notice; typecheck passes, not clicked live yet)
- **Last verified working:** 2026-10-24, live on local n8n (port 5678) with the router and 8 problem workflows (F-010), site at http://localhost:3100:
  - CD-420322 card showed chips Vehicle + Tracking, plan #1 lines with costs (recovery EUR 450) and the "On approval: ..." line. Approve in the browser mock-booked recovery and driver notice; typing the buyer's answer and "Record answer" showed "Agent picking up the next step", and plan #2 (new delivery window) appeared after the wake-up run.
  - The "Driver unwell" sample (CD-420537) showed "Sent. The router picks the problem workflows ..." and the watch spinner until the report landed.
  - CD-420806 (unreachable driver) and CD-420537 show chip `urgent`, sort first, start with an "Urgent: ..." reason and an "Urgent tasks" block, even after a later plan set the case status to needs_decision.
  - `npx tsc --noEmit` is clean and `npm run build` passes (top-level await in `lib/db.ts` is fine).
  - Earlier on the same day: the starter smoke check (`scripts/smoke.ts`) passed, and the record page showed the same case card.

## Track scope
Bahn only. This is the control-room half of the Bahn entry (40% of the score). It sits on top of the On-the-road n8n agent [[F-010-bahn-on-the-road-n8n]]. Velho does not use it.

## Purpose (why this exists, tied to project goal)
This is where a person sees what the agent did, what it checked, and what waits for their decision, and then approves, rejects or finishes steps. The user chose four things on 2026-10-24:
- Claude builds the site.
- It reuses the Bahn starter UI.
- Every area agent shares one contract.
- The first screen has a needs-a-person queue, approve and step buttons, and an event trigger panel.

The user flagged that many more cases and area sub-workflows will follow, so new areas must plug in without rewriting the site.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
- **Sidebar:** "Needs a person" (`/queue`) is the first link. The starter's Orders board, Inbox, Customers, Drivers and Places pages are unchanged. A "Setup" group holds "Settings" (`/settings`). The sidebar footer says agent actions are mock.
- **Settings page (`/settings`):** every tunable number and switch the agent uses, grouped by section (Planning, Driving rules, Tracking, Waiting and reminders, Display, AI thresholds, Customer contact, Demo). Each row shows the name, a plain description, an input (on/off switches are a dropdown), the unit and a Save button that is active only after a change. A note at the top says every value is a placeholder Bahn sets itself and applies from the agent's next step. Bad values are refused with a message: switches only on/off, numbers must be 0 or more, AI thresholds between 0 and 1.
- **Send an event to the agent:** 8 sample buttons, one per problem workflow, fill the form: Vehicle warning CD-420322, Ferry sold out CD-420299, Ferry at risk CD-420603, Delivery access CD-420437, Tracking gap CD-420806, Driver unwell CD-420537, Release document CD-420458, Fuel receipt CD-420710.

  "Send as": a monitoring alert (default, to the area webhook) or "the driver on Telegram" (to `/webhook/bahn/driver-report`: the text is posted in the demo group by the simulated people bot as the order's driver, replying to Bahn's last driver message, and read by tg_inbound like a real driver message; refused when Bahn has not written to that driver yet). The person picks an area, an order reference, the event text and a test switch (alerts only) ("Driver answers" or "Test: driver does not answer", which sends `simulate: driver_unreachable`). The router answers at once; the page then says "Agent working on <ref>…" and polls every 4 s until a new run report appears or 6 minutes pass. Errors show under the form.
- **Agent cases:** one card per order that has a row in any of the agent tables.
  - Urgent cases come first (case status `urgent`, or an open staff task with priority `urgent` or `top`; a `normal` task does not make the case urgent): chip `urgent` in red, first reason "Urgent: ...".
  - A "Staff tasks and reminders" block lists steps that belong to no plan: employee tasks (priority shown) and reminder drafts for the delivery contact. Reminder drafts (steps R1, R2), here or inside a plan, have one-click "Approve and send reminder" and "Don't send".
  - Each card shows chips for the problem workflows from the router's latest `route` line (Vehicle, Journey, Tracking, ...).
  - Other cards that need a person come next, with an orange outline and a list of reasons:
    - a pending proposal
    - a step waiting for a person
    - a failed step that a later booking has not replaced
    - case status `needs_decision` with no pending proposal
    - the agent's last run report is the newest entry and nothing is pending
  - Each card shows the order link with car, customer and route from the dataset, and the case summary.
  - It shows the agent's latest run report when that is the newest timeline entry. Markdown `**` is stripped.
  - Proposals show:
    - label and status
    - for plans: total in EUR; on time or late and "simulated sailing" only when the plan is a ferry rebooking
    - the code-written summary, rationale, next-best alternatives and evidence ids (duplicates removed; the reasons list is de-duplicated too)
    - a pending plan lists every line (step label, EUR cost when above 0, detail) and an "On approval: ..." sentence built from the line kinds (what runs as mock, then what waits for a person)
  - Plans with buyer options show an options table (letter and name such as fastest / cheapest / balanced, recommended or chosen, arrival in the buyer's local time, on time or hours late, total EUR) with a radio choice while pending, and "Offer valid until" in the buyer's local time.
  - A banner explains states that can no longer be acted on: replaced, expired, offered (waiting for the buyer), deciding (someone else is deciding), failed (the agent re-plans).
  - Pending proposals have a note field and Reject. Approve depends on the plan: a plan the buyer must answer has "Approve and send to buyer"; any other plan has "Approve and book now" and "Approve, ask buyer first" (`send: ask_buyer`). The chosen option letter goes along. Plans also have a test-failure select that offers only what the plan or its options contain: ferry sells out / times out once, hotel times out, train sells out, flight sells out.
  - Agent case times (report, conversation, timeline) are in the staff time zone from Settings `employee_timezone` (default Europe/Helsinki), with the zone name; plan options and offer deadline are in the buyer's local time and say so.
  - "Which order?" panel on the queue: incoming Telegram messages the bot could not link (no reply, no single open order; staff were also pinged in Telegram). Staff type the order reference, pick who wrote (buyer, driver, delivery contact) and press "Link and wake agent": the message row gets that order and role, and the router gets an event "<Role> wrote on Telegram (linked to this order by <name>): ...". It goes through the router as a general event, not through the buyer-answer reading in tg_inbound.
  - "Your name" field (kept in this browser): the name goes on every decision, step and driver message; empty falls back to `CONTROL_ROOM_OPERATOR`.
  - "Send to driver" box on every case: a staff message to the driver on Telegram now, no approval (drivers may be messaged); the reply reaches the agent.
  - "Conversation on Telegram" (folded): every message on the order (buyer, delivery contact, driver, staff pings, which-order questions), sent and received, with status when not sent. Media markers become "Open photo / voice / video / document" links to `/api/media/<file id>`; the same links appear in the timeline.
  - Steps of executed plans show status, booking ref, cost and tries. Actionable steps get buttons:
    - "Mark done" (on the customer message step it reads "Sent by me")
    - buyer's answer step: a required "Buyer's answer" field and "Record answer"; recording it wakes the agent and the page watches for its next report
    - staff task: an optional note field
    - "Could not do it" on a waiting step
    - "Retry booking" on a failed hotel only
  - A failed booking (ferry, hotel, train or flight) that a later plan booked again shows "replaced by later booking". When a booking fails the case reads "The agent is re-planning" and the page shows the new plan when it arrives. Evidence tags split only at commas outside brackets; agent step cards use their own `agent-step` class (the starter's `.step` timeline grid squeezed labels).
  - Earlier proposals and the full timeline ("What the agent checked and did") are folded.
- **Order record page (`/orders/<id>`):** an "Agent case" section sits right under the starter's attention panel. It shows the same case card as the queue for that order (reasons, report, proposals, Approve/Reject, step buttons, timeline), so a person can act from either place. With no case it says so and links to `/queue`. The starter's dataset-only "Prior agent work" section further down is unchanged.
- **Flagged in the records, no agent case yet:** dataset orders in the area's lanes (`booked`, `moving` for On the road) whose starter attention list is not empty. Each has "Prepare event for agent", which fills the form with that order and its attention titles.
- **Errors:** if n8n is unreachable or `N8N_API_KEY` is missing, a red banner says "Could not reach n8n: ...". A rejected command (stale plan, double approval, bad input) shows its error text under the form.

## How it works (approach, flow in words, libraries/services used and why)
- **Fork of the starter:** a copy of the Bahn starter is in `BAHN/build/control-room/`. The packet copy in `BAHN/context/.../starter/` is left untouched.
- **Database:** Postgres-js and Docker were replaced by PGlite (Postgres compiled to WASM, running inside the Node process).
  - `lib/db.ts` creates an in-memory PGlite and applies the Drizzle SQL in `drizzle/`. It then runs `seed(db)` from `lib/seed.ts`, the starter seed turned into a function, over the packet's JSONL files.
  - This happens once per server process, cached on `globalThis` across hot reloads, through a top-level await. Seeding takes a few seconds on the first request.
  - All the starter's queries and `lib/present/` projections run unchanged.
- **Agent side:** `lib/agent.ts`, server only.
  - It reads the four n8n Data Tables through the n8n public API (`/api/v1/data-tables/{id}/rows`, paged by cursor) and groups them per order into case views. Table ids are looked up by name once per process.
  - It uses the same "superseded failed ferry" rule as the n8n close gate. Steps whose `proposal_id` is not a plan number (`task`, `escalation`, `step:<id>` reminders) form the staff tasks block; a task's `ref` is its priority; plan line costs come from the plan JSON in the proposal payload; the workflow chips come from the latest `route` timeline line.
  - It forwards commands to the shared webhooks with the operator name. The browser never calls n8n.
  - It also reads `otr_messages` (chat ids are not passed to the browser).
  - Input is checked before forwarding: decision approve or reject, option a single letter, send only `ask_buyer`, driver message needs an order reference and text, outcome done, failed or retry, approve `simulate` in a fixed list (ferry_sold_out, ferry_timeout_once, hotel_timeout, train_sold_out, flight_sold_out), event `simulate` only driver_unreachable, order reference `CD-<digits>`, note at most 1000 characters, event text at most 2000 characters.
- **Area registry:** `lib/areas.ts` lists each area agent with id, label, webhook, watched lanes and sample events. It also holds the word labels for proposal actions, step kinds and problem workflows (`WORKFLOW_LABELS`).
- **API:** `app/api/agent/route.ts`.
  - `GET` returns `{cases, areas, operator}`.
  - `POST` takes `{kind: 'decide'|'step'|'event'|'driver_message'|'link_message', operator?, ...}`; `driver_message` goes to `/webhook/bahn/message-driver`; `link_message` updates the `otr_messages` row (only while it has no order) and posts the event to the On-the-road webhook. `GET` also returns `unlinked` messages and `zone`.
- **Media:** `app/api/media/[fileId]/route.ts` fetches a Telegram file with the Bahn bot token on the server (getFile, then the file) and returns it with a content type from the file extension, so photos, audio and video open in the browser. The token never reaches the browser.
  - `maxDuration` is 300 because agent runs can take minutes.
- **Pages:** `app/queue/page.tsx` is a client page; it also reads `/api/overview` for dataset cards. The case, proposal and step views plus the `useAgent` hook (load, send, poll every 4 s while a command runs, and keep polling after an event or an `agent_woken` step result until a newer run report appears, at most 6 min) live in `app/components/agent-case.tsx`, shared by the queue and the record page's `AgentWorkSection`.

## Files and locations (REQUIRED; every file/folder of this feature as a `path` in backticks, relative to the project root, folders end with /; plus routes, functions, DB tables; one line each on its role. Hooks use these paths to tell the AI which feature an edited file belongs to)
- `BAHN/build/control-room/`: the site, a Next.js 16 / React 19 fork of the Bahn starter. `README.md` has run steps and the area contract.
- `BAHN/build/control-room/lib/db.ts`: in-process PGlite, migrated and seeded at server start.
- `BAHN/build/control-room/lib/seed.ts`: dataset loader, formerly `scripts/seed.ts`. Exports `seed(db)` and `dataset` (the JSONL folder).
- `BAHN/build/control-room/drizzle/`: SQL generated from `lib/schema.ts` by `npm run db:generate`.
- `BAHN/build/control-room/drizzle.config.ts`: generate-only Drizzle config.
- `BAHN/build/control-room/next.config.ts`: `serverExternalPackages: ["@electric-sql/pglite"]`; loads the repo-root `.env` with dotenv (environment values win).
- `BAHN/build/control-room/app/api/media/[fileId]/route.ts`: Telegram file proxy for the conversation panel.
- `BAHN/build/control-room/lib/agent.ts`: reads the n8n tables and forwards commands.
- `BAHN/build/control-room/lib/areas.ts`: area registry and action/step labels.
- `BAHN/build/control-room/app/api/agent/route.ts`: `GET` and `POST /api/agent`.
- `BAHN/build/control-room/app/queue/page.tsx`: the Needs a person page.
- `BAHN/build/control-room/app/settings/page.tsx`: the Settings page (client page).
- `BAHN/build/control-room/app/api/settings/route.ts`: `GET /api/settings` lists settings; `POST {key, value}` saves one (`loadSettings` / `saveSetting` in `lib/agent.ts`, which update the row through the n8n data-table API).
- `BAHN/build/control-room/app/components/agent-case.tsx`: shared agent case views, `useAgent` hook and `AgentWorkSection`.
- `BAHN/build/control-room/app/components/order-detail.tsx`: starter record layout, with `AgentWorkSection` added under the attention panel.
- `BAHN/build/control-room/app/components/app-frame.tsx`: sidebar with the Needs a person first link and the Setup / Settings link.
- `BAHN/build/control-room/app/globals.css`: starter styles plus a "Needs-a-person queue" block and setting-row styles at the end.
- `BAHN/build/control-room/lib/attachments.ts`, `BAHN/build/control-room/scripts/smoke.ts`, `BAHN/build/control-room/scripts/seed-attachments.ts`: default paths now point at the packet in `BAHN/context/car-delivery-control-room/`.
- `.claude/launch.json`: dev-server entry `bahn-control-room`, which runs `npm --prefix BAHN/build/control-room run dev -- -p 3100`.

## Setup and config (everything needed to recreate it)
- Node.js 24+.
- `npm ci` in `BAHN/build/control-room/`. If npm fails with `EEXIST` in its cache tmp folder (seen on 2026-10-24), add `--cache <fresh folder>`.
- Local n8n with the BAHN workflows and tables: `node BAHN/build/n8n/setup.mjs --seed` (see [[F-010-bahn-on-the-road-n8n]]).
- Start: `npm run dev -- -p 3100` inside the folder, or the `bahn-control-room` launch entry. Open `/queue`.
- **Env var names:**
  - Read from the process environment first, then from the repo-root `.env` (loaded in `next.config.ts`).
  - `N8N_API_KEY` (required; on this machine also a Windows user env var, see [[F-005-n8n-mcp-local]])
  - `TELEGRAM_BOT_TOKEN` (for opening Telegram photos, voice and files; without it the media links answer 503)
  - `N8N_API_URL` (default `http://127.0.0.1:5678`)
  - `CONTROL_ROOM_OPERATOR` (name recorded as the decider; default `ops (control room)`)
  - `DATASET_DIR` and `ATTACHMENTS_DIR` (optional overrides)
  - `S3_*` (only for the starter's sample-file strip)
- After restarting n8n setup (new table ids), restart the site.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
- The site stores nothing of its own. The snapshot database is in memory and rebuilt from the synthetic JSONL on every start.
- Agent state is read from n8n Data Tables: `otr_cases`, `otr_timeline`, `otr_proposals`, `otr_plan_steps`, `otr_messages` and `otr_settings` (the Settings page writes only the `value` column of `otr_settings`). Their fields are listed in [[F-010-bahn-on-the-road-n8n]].
- Every decision and step outcome is written there by n8n, with the operator name.
- All data is fictional. Bookings and messages are mock.

## Read first / Depends on (REQUIRED; links to features this relies on, written [[F-###-slug]] = exact feature file name without .md, one per line with a short reason; or the word none. Backlinks are computed by the hooks, never write them)
[[F-010-bahn-on-the-road-n8n]] - the agent, tables and webhooks this site reads and calls.
[[F-004-bahn-entry]] - Bahn rules: approval before any booking, cost or customer message; synthetic data; judging.
[[F-008-challenge-source-files]] - the packet (starter, dataset, attachments) this site forks and reads.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
- **Shared contract for future areas, chosen by the user:** every area agent writes the same four tables and uses the shared act and step webhooks. Each run ends with a `run_report` timeline line. Adding an area is one n8n workflow plus one `AREAS` entry. The steps are in `BAHN/build/control-room/README.md`.
  - **Not built yet (YAGNI until a second area exists):** `otr_cases` has no `area` column, so all cases show under one queue. Inside On the road, the n8n router already sends follow-ups back to the workflows on the case. Add the column once a second area agent writes cases.
- **PGlite instead of Postgres:** Docker is absent on this machine. PGlite keeps every starter query working without a server. Its limit is that data lives only in memory per process, which is fine because the snapshot is read only.
- **Dev-server cache trap:** after editing `app/components/app-frame.tsx`, the dev server kept rendering the old sidebar. This caused hydration errors until a restart. If the server HTML and the client disagree after an edit, restart the dev server.
- **"Needs a person" means waiting on staff (name kept by the user on 2026-10-24; do not rename):** the list is for Bahn Express office staff, not drivers. It covers approvals, manual steps such as sending the customer message, failed steps and questions in the agent's report. The starter's record attention panel also uses the heading "Needs a person" for dataset items. Drivers reach the agent through the n8n driver workflow; the event panel stands in for automatic feeds (provider alerts, tracking, driver messages).
- **The sample-file strip needs the starter's S3 store,** which is not running. Without it, the record page says it could not load files.
- **Wake-up:** recording a buyer's answer, or finishing a plan's last open step, wakes the agent (F-010). A failed booking does not; the person sends a re-plan event.
- **The agent can decline to file a plan.** Such a run shows only as a run report with the reason "The agent's last run asks for your call".
- **Only one watch at a time:** sending a second event while the first run works moves the spinner to the newer one; the page still refreshes until that one reports.

## How to verify (steps to confirm it works)
1. Run `node BAHN/build/n8n/setup.mjs --seed`, then start the site and open http://localhost:3100/queue.
2. Click "Ferry sold out", then "Send to agent". Within about 2-4 min a CD-420299 card shows chip Journey and "Plan #1 waits for approval" with its lines and total EUR 568.8.
3. Choose "Test: ferry times out once" and click Approve. The steps should show ferry done with 2 tries, hotels done, driver notice done, and the customer message and buyer's answer waiting.
4. Type a buyer's answer and click "Record answer"; the page shows "Agent picking up the next step" until the agent's next report.
5. Send "Tracking gap" with "Test: driver does not answer": the card turns urgent with an urgent task.
6. Run `APP_URL=http://localhost:3100 npx tsx scripts/smoke.ts` in the site folder. It should print "Board and record agree".
7. Open `/settings`, change "approval buffer min", Save: the value is stored in `otr_settings`; typing letters is refused with "must be a number of min".
8. Reset for a clean demo with `node BAHN/build/n8n/seed.mjs --reset-cases`.

- **Updated-offer notice:** when a new plan replaces an offer the buyer holds, its step 0 draft ("Our earlier offer is no longer valid; an updated offer follows shortly.", made by propose_action) shows Approve and send to buyer (step outcome done; plan_step sends it via the bot) and Don't send (outcome failed). StepView in app/components/agent-case.tsx (holding = customer_message, step 0, plan id > 0). Typecheck passes; not clicked live yet.
- **Incident task buttons:** an open staff task (proposal_id task) shows Replacement driver, Plan cancellation and Mark urgent. POST kind task_action {step_id, action: replacement|cancel|urgent, note}. Urgent PATCHes the otr_plan_steps row ref to urgent (case turns urgent). Replacement and cancel send a control_room event to the router naming the task, so the agent files a plan a person approves. Code in lib/agent.ts runCommand and StepView in app/components/agent-case.tsx. Typecheck passes; not clicked live yet.

## Open TODOs (unfinished work and next steps for this feature)
- Phase 6 item not built yet: flag a mistake (Promote / Discard) UI; the n8n and Promptfoo side is in F-010 and is being set up and tested by Gemini AGY.
- Add an `area` column and more area agents (the user expects many).
- Pick hosting for the demo.
- Live event stream instead of 4 s polling, if time allows.
- Maybe use Promptfoo (F-007) for regression cases, such as "no customer message before approval".
