# F-015 - Bahn Telegram messaging (send, receive, simulated people)
<!-- Current truth only. No secret values. -->

- **Scope:** Bahn only
- **Status:** working
- **Built by:** claude-opus-5-5 via Claude Code, 2026-10-25
- **Last edited by:** claude-opus-5-5 via Claude Code, 2026-10-25 (order linking, which-order buttons, reopen check, buttons removed after a tap, media reading)
- **Last verified working:** 2026-10-25, live on CD-420299 in DEMO-CHAT and STAFF-CHAT. Driver question and reply, the 112 safety line and a staff ping arrived. Plan #6 was offered with option buttons, the simulated buyer chose B, and the plan was booked and the driver told. Reminders: with 1-minute waits, a silent buyer got a reminder draft; offer #7 then expired, its buttons were removed, the agent made plan #8, and staff got two reminders and an escalation to Shift lead about plan #8. Offline tests pass (`node BAHN/build/n8n/test_workflows.mjs`, "telegram inbound" and "reminders").

## Track scope
Bahn only. It is the messaging channel of the On-the-road agent ([[F-010-bahn-on-the-road-n8n]]). The Bahn rule still holds: every buyer and delivery-contact message is approved by an employee (inside the plan) before it is sent. Drivers and the staff group get messages without approval.

## Purpose (why this exists, tied to project goal)
Agreed item 11 (messaging channel) and item 12 (simulated driver on Claude Haiku 5.5). The flow is: the AI writes a draft, an employee approves it, the system sends it on Telegram, and the system receives the answer and acts on it. Nobody types replies in by hand. For the demo the user plays no role: simulated people answer in the same group, so viewers see the whole conversation.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
- **Demo group "DEMO-CHAT"** holds both bots. The Bahn bot (@MyBahnBot_bot) labels each message with who it is for, for example "To buyer Kavellora Car House (CD-420299):". The simulated people bot (@MyBahnSimBot_bot) labels who is speaking, for example "Buyer, Kavellora Car House (CD-420299):".
- **Staff group "STAFF-CHAT"** holds only the Bahn bot. Every employee task (create_employee_task) is posted there as "Staff task (CD-x): URGENT: / TOP priority: / NORMAL priority: ... Open the control room to act."
- **Sent automatically when an employee decides (act):**
  - the buyer offer, with one button per option ("A: fastest, EUR 722.8, arrives ...") plus "None of these", and "Please choose by <deadline in buyer time>";
  - the driver's "keep to your current plan" note;
  - after booking, the driver instruction with booking refs and the approved delivery-contact message.
- **Driver messages** (message_driver, including the automatic 112 safety line) go out from the Bahn bot. The simulated driver's reply is posted by the simulated people bot.
- **Buyer answers:**
  - a button tap, "option B" or a bare letter is exact and records buyer accept/decline on the plan through `/webhook/bahn/act` (operator "buyer via Telegram");
  - other free text is read by GLiDE (accept / decline, threshold `glide_buyer_reply`);
  - an answer that is not clear becomes a normal employee task with a follow-up question drafted by Claude Haiku 5.5, which the employee approves before it is sent; the same happens when GLiDE is down.
- **Delivery-contact answers:** a clear confirmation (GLiDE) is logged; anything else becomes an employee task.
- **A driver message** linked to an order starts a new agent event ("Driver wrote on Telegram: ...").
- **Order linking** (node Link, in this order): a tap on a "which order" button `o:<ORDER>:<role>` (the original text is taken from the question row); a Telegram reply to a Bahn message; else the sender's open orders from their earlier messages (`otr_messages` rows where `chat_id` = their Telegram user id; orders whose latest case is `closed_by_agent` do not count). Exactly one open order: linked as "only open order". Several: the bot asks "which order" with one button per order (kind `which_order`). None: the staff group is asked which order it is about.
- **Closed case:** a buyer or delivery-contact message on a case closed by the agent is checked by GLiDE ("new issue", threshold `glide_reopen`); a new issue wakes the agent ("Buyer wrote on Telegram after the case was closed: ..."), thanks or ok is only logged. If GLiDE is down it reopens.
- **Button taps:** the buttons are removed from the message at once (editMessageReplyMarkup) and the tap is answered (answerCallbackQuery), so the spinner stops.
- **Photos, voice, audio, video, video notes and files:** tg_poll passes the file id (largest photo) and the caption as text. tg_inbound downloads the file (getFile) and sends it to OpenRouter: images to Claude Haiku 5.5, audio to Gemini 3.5 Flash (ogg, mp3, wav, m4a, aac, flac, webm), video as a video URL part, other files as a file part. The answer (language, transcript, English, description) is added to the message text as `[voice message, German: "..." (English: "...")]` plus a marker `[media <kind> <file id>]`; if reading fails the text says "could not be read automatically" so staff open the file. Live-tested 2026-10-25 on CD-420299: a photo described by Haiku and an English WAV transcribed by Gemini, both woke the agent.
- Every incoming message is logged on the case timeline (kind `telegram_in`) and in `otr_messages`.
- **Driver report test path (`BAHN test · driver report via Telegram`, `POST /webhook/bahn/driver-report` `{order_ref, text}`):** posts the text through the simulated people bot as "Driver, <name> (<order>):", replying to Bahn's last message to that driver, then hands it to tg_inbound (linked by that reply, wakes the agent). Used by the control room event panel "Send as the driver on Telegram". Live-verified 2026-10-25 on CD-420603.
- **Test switch:** setting `sim_person_behaviour` = answer | fastest | cheapest | balanced | decline | unclear | silent sets how the simulated buyer and delivery contact answer.
- **Reminders (`BAHN tool · otr_reminders`, every minute, demo clock):** every message that expects an answer opens a row in `otr_waits` (tg_send: delivery contact, buyer offer with buttons, driver question).
  - Driver silent: automatic Telegram reminder after `reminder_wait_driver_min`, up to `reminder_count`, then an employee task (urgent, workflow tracking).
  - Buyer or delivery contact silent: each reminder is a draft step (step_no R1, R2, status waiting_for_person) the employee approves; marking it done in plan_step sends it (a buyer reminder carries the option buttons again). After `reminder_count`: a normal employee task.
  - Offer deadline passed (`valid_until`): the wait is marked expired, the offer's buttons are removed in Telegram, unsent reminder drafts are skipped, the plan turns `expired` with the reason, staff are told, and the agent is woken with the plan's workflows to make a revised plan.
  - Plan no longer offered (accepted, replaced): its wait closes and the buttons are removed.
  - Employee: every pending plan and every open step (except buyer_decision) gets an employee wait. After `reminder_wait_employee_min` the staff group gets "Reminder n: ...", after `reminder_count` "ESCALATED to <escalation_role>: ...". The wait closes when the item is resolved. Escalated waits are kept, so the same item is not reopened.
  - One code node (Decide) decides everything and emits typed actions; one If plus one node per action type carries them out. Successful runs are not saved.
- **Customer language:** with setting `reply_in_customer_language` = on (default), a message to a buyer whose order snapshot says another language (`customer.language`, the language they wrote in most: de, fr, fi in the demo data) is translated by Claude Haiku 5.5 right before sending. The message shows the translation first and "(English: ...)" below it. The employee approves the English draft as before. Names, times, prices, refs and option letters are kept as written; button labels stay English. If the translation fails, the English goes out alone. Drivers, staff and simulated replies are never translated. Delivery contacts have no language in the data, so they get English. Live-tested 2026-10-25: a test message to German buyer CD-420458 went out in German with the English below.
- **Threading:** bots cannot see each other's messages, so a simulated reply may not show as a threaded reply. It is still sent (`allow_sending_without_reply`), and its label names the person and order.

## How it works (approach, flow in words, libraries/services used and why)
- **`BAHN tool · tg_send`** is the only workflow that posts to Telegram. Inputs: order_ref, role (buyer | delivery_contact | driver | staff), text, proposal_id, kind, buttons (JSON list of {key, label}), reply_to, from_sim.
  - It reads names from the stored order snapshot and posts through an HTTP Request node to `https://api.telegram.org/bot<token>/sendMessage`.
  - Buttons carry callback data `a:<proposal_id>:<key>`.
  - It logs a row in `otr_messages` (direction out, or in for simulated posts).
  - For a buyer or delivery contact it starts `sim_person` without waiting.
- **Translation inside tg_send:** nodes Settings, Language (decides and writes the prompt), Translate? and Translate (chainLlm with "Translate model", Claude Haiku 5.5 via OpenRouter, temperature 0) sit between Context and Prep. `otr_messages.text` stores what was actually sent (translation plus English).
- **`BAHN tool · sim_person`** plays the buyer or the delivery contact, using Claude Haiku 5.5 on a FACTS block from the order snapshot.
  - It answers with JSON (text, tapped button) and posts the reply through the simulated people bot.
  - It then POSTs the same reply to `tg_inbound`, in the shape `tg_poll` gives a real Telegram update. Real and simulated replies take one code path; only the transport differs.
- **`BAHN tool · tg_inbound`**, webhook `POST /webhook/bahn/tg-in`:
  - links the reply to the Bahn message it answers (`otr_messages` by Telegram message id), then button data;
  - decides with code first, then GLiDE;
  - logs the reply, then calls act, the router, or create_employee_task, or asks staff.
- **`BAHN tool · tg_poll`** polls the Bahn bot's getUpdates every 5 s. The polling position is stored in setting `tg_update_offset`. It sends demo-group messages and button taps (not bot messages) to `tg_inbound`. Successful runs are not saved, so the 5-second poll does not fill the execution list. Polling needs no public URL or tunnel; switch to a Telegram webhook when hosted.
- **Hooks:**
  - `act_proposal_decision`: nodes Outbox, Anything to send?, Send on Telegram (one run per message), Wake once. They sit after Insert steps and before Wake?.
  - `create_employee_task`: node Ping staff.
  - `message_driver`: nodes Post to driver and Post reply.
- **Simulated driver** (`simulated_driver.json`, model node "Driver model") now runs on Claude Haiku 5.5. It still answers inside the same run and is fact-checked by GLiDE. The new sim_person handles only buyers and delivery contacts.
- Why plain HTTP and not n8n's Telegram node: inline buttons with our own callback data and a choice of two bots per message are simpler as one HTTP node. Tokens and chat ids are read from n8n's environment (`$env`).

## Files and locations (REQUIRED)
- `BAHN/build/n8n/workflows/tg_send.json`: Telegram sender (placeholder id OtrTgSendWf01; live id `Dxicp6GlkMzzmPjd`).
- `BAHN/build/n8n/workflows/sim_person.json`: simulated buyer and delivery contact (OtrSimPersonWf01; live `lq3GEQjzg2ikGjmX`).
- `BAHN/build/n8n/workflows/tg_inbound.json`: incoming messages, webhook `bahn/tg-in` (OtrTgInboundWf01; live `fwxA86p6ATrwG1Qw`).
- `BAHN/build/n8n/workflows/tg_poll.json`: 5-second poller (OtrTgPollWf01; live `c7YbTOFgLBmgLA38`).
- `BAHN/build/n8n/workflows/otr_reminders.json`: reminder check (OtrRemindersWf01; live `K6qfQz2rfoFIs8PO`).
- `BAHN/build/n8n/workflows/lib/offer.js`: offer buttons, shared by act and plan_step.
- `BAHN/build/n8n/workflows/plan_step.json`: marking a buyer or delivery-contact draft done sends it on Telegram.
- `BAHN/build/n8n/workflows/act_proposal_decision.json`, `escalate_urgent.json`, `message_driver.json`, `simulated_driver.json`: the hooks listed above.
- `BAHN/build/n8n/workflows/lib/settings.js`: `reply_in_customer_language` (on), `sim_person_behaviour`, `tg_update_offset`, `glide_buyer_reply`, `reminder_wait_driver_min` (15), `reminder_wait_buyer_min` (30, also delivery contact), `reminder_wait_employee_min` (15), `reminder_count` (2), `escalation_role` (Shift lead), `offer_valid_min` (120).
- `BAHN/build/n8n/setup.mjs`: ORDER deploys sim_person, then tg_send, before message_driver, and tg_inbound and tg_poll after create_employee_task.
- `BAHN/build/n8n/workflows/tool_test_hooks.json`: `POST /webhook/bahn/test/tg_send` sends one message directly (same inputs as tg_send).
- `BAHN/build/n8n/test_workflows.mjs`: "customer language" checks (German buyer translated, switch off, driver/staff/simulated not translated, translation first with English below, English alone when the translation fails); "Telegram inbound" checks (button, typed letter, an article is not an option, decline, unclear, GLiDE down, unlinked, driver, delivery contact).
- Data Tables `otr_messages` (every message in and out), `otr_waits` (open waits) and `otr_settings`.

## Setup and config (everything needed to recreate it)
- **Two bots made by the user in BotFather:** the Bahn bot and the simulated people bot.
  - Privacy can stay on: the Bahn bot still gets replies to its own messages and button taps.
  - Turn privacy off (`/setprivacy` > Disable) only to read every group message.
- **Two groups made by the user:** "DEMO-CHAT" (both bots) and "STAFF-CHAT" (Bahn bot only).
- **Env var names in the repo-root `.env`** (values never written here):
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_SIM_BOT_TOKEN`
  - `TELEGRAM_DEMO_CHAT_ID`
  - `TELEGRAM_STAFF_CHAT_ID`
  - The group ids were read with getUpdates after a "hi" in each group, and written into `.env` without being printed.
- **Start n8n with these variables exported,** plus the usual flags (`N8N_BLOCK_ENV_ACCESS_IN_NODE=false` so nodes can read `$env`), then run `node BAHN/build/n8n/setup.mjs`. n8n reads the environment only at start, so restart it after changing `.env`.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
- `otr_messages`: order_ref, direction, person_key, role, chat_id, tg_message_id, reply_to_tg_id, proposal_id, kind, text, buttons, status (sent | failed: reason | simulated | received).
- `otr_waits`: order_ref, who (driver | buyer | delivery_contact | employee), person_key, about, ref (proposal id for a buyer offer; `proposal:<id>` or `step:<id>` for employee waits), since, reminders, state (open | answered | expired | escalated | done | closed: reason), last_reminded.
- Timeline rows of kind `telegram_in`.
- Synthetic orders only. The demo group shows the synthetic buyer and driver names from Bahn's packet.

## Read first / Depends on (REQUIRED)
- [[F-010-bahn-on-the-road-n8n]]: the agent, act decisions, employee tasks and settings this channel serves.
- [[F-006-fastino-readiness]]: GLiDE, which reads free-text replies.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
- Bots never receive other bots' messages. That is why the simulated reply is posted for viewers and also handed to tg_inbound inside n8n.
- tg_inbound is triggered by a webhook, not called as a sub-workflow. This breaks the loop: tg_send starts sim_person, sim_person posts to tg_inbound, and tg_inbound calls create_employee_task, which pings staff through tg_send.
- The "Send on Telegram" step in act must run once per message (mode each). Otherwise only the first message of a decision goes out.
- A message to the driver is a status update or instruction. It never carries buyer-only details.

## How to verify (steps to confirm it works)
1. `POST /webhook/bahn/test/message_driver` with `{"order_ref":"CD-420299","recipient_type":"driver","text":"..."}`: the question appears from the Bahn bot and the reply from the simulated people bot; both rows are in `otr_messages`.
2. Send a ferry sold-out event, then approve the plan with `send: ask_buyer`. The offer with buttons appears, the simulated buyer answers, and the plan turns `executed` with operator "buyer via Telegram".
3. In DEMO-CHAT, reply to a Bahn message yourself or tap a button. Within about 5 s it shows on the case timeline.
4. Reminders: set `reminder_wait_*_min` to 1, `offer_valid_min` to 3 and `sim_person_behaviour` to silent, approve a plan with `send: ask_buyer`; within about 5 minutes see the reminder draft, expiry, buttons gone, a new plan and staff pings. Restore 15/30/15/120/answer afterwards.
5. `node BAHN/build/n8n/test_workflows.mjs` passes.

## Open TODOs (unfinished work and next steps for this feature)
- The driver reminder path is tested offline only: the simulated driver always answers inside the same run.
- Tested offline only: which-order buttons, reopen, button removal on a real tap, non-English audio and video.
- Buyer replies in another language: button taps and option letters work; free text goes through GLiDE, which is not yet tested on German or French replies.
- The control room does not yet show the translated text before approval (Phase 6); the employee sees it in `otr_messages` and in Telegram after sending.
- The real-person path (a human typing in the group) is built but not yet tested live.
