# Bahn control room (fork of the Control Room starter)

The starter's read-only order screens, plus a **Needs a person** page (`/queue`) wired to the n8n area agents in `BAHN/build/n8n`.
The snapshot is loaded into an in-process Postgres (PGlite) from `BAHN/context/car-delivery-control-room/dataset/data` on every server start, so no Docker is needed.
Agent state (cases, timeline, proposals, plan steps) lives in n8n Data Tables; this site only reads them and forwards a person's decisions.

## Start

Needs Node.js 24+, local n8n running with the BAHN workflows (`node BAHN/build/n8n/setup.mjs --seed`), and `N8N_API_KEY` in the environment.

```sh
npm ci
npm run dev -- -p 3100
```

Open http://localhost:3100/queue. Optional env: `N8N_API_URL` (default `http://127.0.0.1:5678`), `CONTROL_ROOM_OPERATOR` (name written as the decider, default `ops (control room)`), `DATASET_DIR`.
After editing `lib/schema.ts`, run `npm run db:generate`. Sample files need the starter's S3 store (`attachments:seed`); without it the files strip says it could not load.

## Needs a person (`/queue`)

- **Send an event to the agent:** pick a sample or type an alert/driver report for an order; it goes to the area's n8n webhook. The page polls while the agent works.
- **Agent cases:** one card per order the agent touched. Reasons it needs a person, the agent's last run report, proposals with code-written summary, rationale, alternatives and evidence ids, then Approve/Reject (with an optional note and, for rebooking plans, a test failure). Executed plans show their steps; waiting or failed steps get Mark done / Could not do it / Retry booking (hotel only).
- **Flagged in the records:** orders in the area's lanes whose records already need a person, with a button that prepares an event for the agent.

## Adding an area agent (shared contract)

1. Build the area's n8n workflow behind a webhook that takes `{ order_ref, source, event }`.
2. It writes only to the shared tables: `otr_cases` (order_ref, status, owner, summary), `otr_timeline` (order_ref, actor, kind, text, source_ref; end every run with a `run_report` line), `otr_proposals` (filed through the `propose_action` tool, never executed directly) and `otr_plan_steps`.
3. People decide through the shared webhooks `/webhook/bahn/act` and `/webhook/bahn/step`; new proposal actions need a mock executor in `act_proposal_decision`.
4. Add one entry to `lib/areas.ts` (id, label, webhook, lanes, sample events) and labels for new actions or step kinds. The queue needs no other change.

## What is here

- `lib/schema.ts`: typed tables for orders, customers, managed sites, one-off addresses, vehicles, drivers, items, conversations, messages, alerts and operational events. Other dataset collections, including internal room activity, keep their complete fields in `related_records` JSONB.
- `lib/present/`: the reading layer. It turns records into labelled view models: `labels.ts` (codes to words), `actors.ts` (identifiers to names and roles), `attention.ts` (what needs a person and which date decides the next step), `board.ts` (one card per order), `record.ts` (the order page, section by section) and `events.ts` (one sentence per event). Nothing here is a source of truth; every value points back to a record in the API.
- `lib/seed.ts`: loads every collection named in the dataset manifest into the in-process database at server start. It checks basic field types while loading. `lib/db.ts` opens it; `lib/agent.ts` and `lib/areas.ts` hold the n8n side.
- `GET /api/overview?q=...`: lane totals, per-lane attention counts and all matching order cards. Each card carries its derived attention items, the date that decides its next step and short work lines.
- `GET /api/orders/:id`: one order with its linked addresses, managed site profiles when present, vehicle, assigned drivers, alerts, messages, event history and other records, plus `view`, the same information read out for the interface: a plain-language headline, four tiles, the route, threads, evidence, proposals and history.
- `GET /api/entities/:kind` and `GET /api/entities/:kind/:id` for `driver`, `customer` and `site`: a list with order counts, and one record with its facts and the orders it is involved in. These serve the Customers, Drivers and Places pages.
- `GET /api/inbox`: support threads that arrived without a safe order link, plus their messages, and a `view` with names and order references. Candidate orders are hypotheses; `linked_order_ids` holds confirmed links. These records stay in `related_records` so the order detail route does not silently file an unresolved thread under a car. The Inbox page shows them as a mailbox.
- `GET /api/reference-data`: shared fictional terminals, road estimate ranges and operations actors that are not tied to a single order.
- `GET /api/orders/:id/attachments`: metadata for the order's fictional PDFs and photos, with short-lived read-only URLs from the local attachment store.

The board shows every order in its lane. Within a lane, orders that need a person come first, then the date that decides the next step: the requested pickup for new orders, the selected pickup slot while a driver is found or booked, the delivery promise while the car moves, and the recorded delivery or cancellation after that. Each card shows the car, reference, customer, route, that date and up to three short work lines: open alerts, owned work, waiting conversations, agent proposals and the assigned driver or live offer. "Needs a person" filters the board to orders with any of those. Search by reference, plate, customer, vehicle or city. Click a card to open its full record at `/orders/:id`.
The attention signal is derived from open alerts, unresolved incidents, open work items, open conversations, pending or failed agent proposals, unresolved endpoint claims, custody follow-ups, support inbox threads that name the order, and a moving car whose driver has started the leg while the app has sent no position and the delivery promise is still open. A conversation filed on one order and related to another counts for both, on the board and on the record. A quiet card means those records are empty, not that the order is verified safe. `display_lane` and the derived signal are reading aids for this starter, not operational truth.
The order record is deliberately short. It opens with the model illustration, the car, a few facts as chips, one sentence of context and one headline about the situation ("Cole Mervalen collects it tomorrow.", "Running late to Hamburg.", "Still being prepared."). When the attention list holds a danger or warn item, the detail line ends with the first of them as "Open: ...". A danger item also gives the headline that tone. Then "Needs a person", four tiles (pickup, delivery, driver, fee or ETA), the route as stops with a leg between them, conversations with the last message, evidence as chips and a strip of sample files, prior agent work and the latest activity. When nothing is waiting, the panel says "Nothing in the records is waiting on a person." and names which records were checked and which were not. "Prior agent work" lists proposals already on the order with their recorded review. A team's own agent and the human decision on its proposals belong there. Everything else is folded under "Everything on this order": route details, alerts and work, drivers, the driver market, travel, costs, proofs and documents, prior agent work with room activity, and the full history. The page shows the shape of the data; the API and those folds hold the depth. Names of customers, drivers and sites link to their own pages, and order references link to the order. "Not supplied" is an unknown input, not a failed pickup. Labels come from `lib/present/labels.ts`; the raw codes stay in the API.
Open, acknowledged, resolved and dismissed alerts remain distinct in the order view. An acknowledged alert still appears on the board with its owner; it is not treated as resolved. A dismissed alert retains the stale or invalid source and the evidence for dismissing it.
The order detail also shows selected sample photos and PDF links when the order has bundled files. The signed links expire after 15 minutes; reload the page to refresh them. Booked travel is shown separately from options. For a moving car, the first-view ETA comes from the last direct driver-app observation; a later schedule inference is labelled separately. Tracking records in this packet have no map coordinates, so the starter does not draw a live position.
Slots, promises and ETAs show the window's local time with its zone name; everything else is UTC, and every time carries the full UTC value on hover. Relative phrases such as "in 2 d" are measured against the snapshot time, not the real clock. Messages show their channel and recipient, because a case workspace is not one shared public thread.

This starter does not include write actions, an agent, permissions or grading. Those choices are part of the challenge. Before any agent acts, a team should decide which facts are current, what evidence supports them, and who can approve the action.

## Check

```sh
npm run typecheck
npm run build
APP_URL=http://localhost:3100 npm run smoke
APP_URL=http://localhost:3100 npm run attachments:smoke
```

The first smoke check compares one order's plans, points and segments in the API with the JSONL source, then fetches every board card and its order record and fails if they disagree on whether the order needs a person. The attachment check downloads one file of each format and checks its hash against the manifest. Run the app before these checks. The seed and the checks read the packet's `dataset/data` and `attachments` folders; set `DATASET_DIR` or `ATTACHMENTS_DIR` to point them at another folder with the same files.

## Rerun on modified input

Start the dev server with `DATASET_DIR=/path/to/your/copy`. The database is rebuilt from that folder on start after checking every collection's row count against its manifest, so change values rather than the number of rows, or update the manifest as well.

All names, messages and events in the bundled dataset are fictional. The starter uses Bahn's birch, asphalt and sand colours and loads Unbounded, Poppins and Reddit Mono from Google Fonts as the brand's published fallback faces, falling back to Arial without a network. It does not bundle licensed brand fonts or copy Portal screens.
