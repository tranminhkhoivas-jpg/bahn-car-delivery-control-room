# Bahn: tests still to run

All data is synthetic. n8n: http://127.0.0.1:5678 (API key = `N8N_API_KEY` in the repo-root `.env`). Control room: http://localhost:3100/queue (start: `npm run dev -- -p 3100` in `BAHN/build/control-room`).
The router event webhook is the path of node "Event webhook" in `BAHN/build/n8n/workflows/on_the_road_agent.json`. Agent runs take 1-5 minutes; read results in the control room or through `GET /api/v1/executions?includeData=true`.
Type a name in "Your name" on the queue page first. Report each test as PASS / FAIL with what you saw and exact error text.

## A. Setup and build
1. `node BAHN/build/n8n/setup.mjs` ends with `done` (8 `langfuse bahn-agent-<key>` lines, `table otr_prompt_fixes`, workflow "BAHN prompts · fix from a flagged mistake" active).
2. `node BAHN/build/n8n/test_workflows.mjs` ends with its `ok:` line.
3. `npx tsc --noEmit` and `npm run build` in `BAHN/build/control-room` pass.
4. README check: follow `BAHN/README.md` steps 1-4 as written and report any step that is wrong or missing (do not wipe the existing n8n; just check that the commands and paths exist and work).

## B. Langfuse, prompt fix, Promptfoo
5. Send the "Ferry sold out" sample (CD-420299). In the newest "BAHN agent · Journey disruptions" execution, node "Prompt" shows `prompt_version: langfuse v1` (not `repo`).
6. `POST /webhook/bahn/prompt-fix` with `{"order_ref":"CD-420299","agent":"journey","complaint":"The agent told the driver the new ferry time before a person approved the plan; it must only say to keep the current plan until we confirm.","operator":"test"}` returns ok, an id and version 2, and Langfuse has `bahn-agent-journey` label candidate = version 2.
7. `node BAHN/build/n8n/promptfoo/run.mjs <id>` prints `Promptfoo: candidate x/3 passed · current y/3`; the otr_prompt_fixes row has status `tested`. Do NOT promote in Langfuse.

## C. Agent flows (control room)
8. Ask buyer first and options: on a plan with several options, choose an option, click "Approve and ask the buyer first". The plan shows "Sent to the buyer"; the buyer offer with option buttons appears from the Bahn bot in the Telegram demo group; the simulated buyer answers; the agent continues and the chosen option is booked (mock).
9. Updated-offer notice: after test 8 (offer open), send a new event on the same order. The old plan shows "Replaced"; the new plan has a step "Our earlier offer is no longer valid..." with "Approve and send to buyer". Click it; the message appears from the Bahn bot in the demo group.
10. Reminders: when a buyer or delivery contact stays silent, a "Reminder 1 draft" step appears under "Staff tasks and reminders" (to force it, lower the reminder wait on /settings). Click "Approve and send reminder" and check it is sent; on another one click "Don't send" and check it is marked failed and nothing is sent.
11. Incident buttons: send the "Driver unwell" sample (CD-420537). On its staff task click "Mark urgent" (task shows "urgent priority", case urgent). Click "Replacement driver": within 5 min a new plan with a driver change appears. On another order with a task, "Plan cancellation" produces a plan with a cancellation step.
12. Asked times: on a plan step asking "Car ready at" / "Driver can start driving at", enter a time and Mark done; the agent re-plans from that time. Leave it empty once; staff are asked again later and nothing is rebooked.
13. Several problems in one report: send event "Driver report: the windscreen cracked, the ferry tomorrow is sold out and the buyer is not answering." on CD-420299. The router picks more than one workflow (route line), and ONE plan comes out covering them.
14. Same-second events: send two different events on the same order at the same moment (two parallel POSTs). Only one plan ends up pending; the other run joins or is replaced, with no duplicate pending plans.
15. Which order: a Telegram message the bot cannot link shows in "Which order?"; link it to an order as Buyer; the agent wakes on that order.
16. Send as driver: in the event form choose "Send as the driver on Telegram"; the message appears labelled as the driver in the demo group and the agent handles it.
17. Approval guard: no buyer or delivery-contact message is ever sent without a person's click (check the Telegram demo group across all tests above).

## D. Before recording
18. Reset demo data: `node BAHN/build/n8n/setup.mjs --seed`, then the queue shows no agent cases.
