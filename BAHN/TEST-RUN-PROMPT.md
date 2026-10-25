# Prompt: full Bahn test run before the demo

Paste everything below the line into a fresh Claude Code chat opened in the project root
(`D:/my stuffs/Projects/hackathon/prompt hackathon operation`).

---

You are running the full test of the Bahn Express "Car Delivery Control Room" before the demo video. Test only: do not build features, do not refactor, do not push to GitHub, do not promote Langfuse prompts. If something fails, record it and move on; fix nothing unless I say so.

## 1. Read first (in this order)
1. `AGENTS.md` (project rules; master doc rules are mandatory).
2. `ai-docs/INDEX.md`, `ai-docs/PROJECT_BRIEF.md`, `ai-docs/PROTOCOL.md`.
3. `ai-docs/features/F-004-bahn-entry.md`, `F-010-bahn-on-the-road-n8n.md`, `F-012-bahn-control-room-site.md`, `F-015-bahn-telegram-messaging.md`, and every feature they list under "Read first".
4. `BAHN/README.md` and `BAHN/TESTS.md` (the test list you will run).

## 2. Rules
- Never print or write secret values (keys, tokens, passwords, Telegram chat ids). Use env var names from the root `.env` only.
- Synthetic data only. No real customer is ever messaged. A person's click is required for every booking, date change, cost and customer message; if you ever see a buyer message sent without one, that is a FAIL of test 17.
- Do not delete n8n workflows. Do not run test 18 (demo reset) unless I say so.
- Test 7: run Promptfoo, but do NOT promote the candidate to production.
- Services: n8n at `http://127.0.0.1:5678`, control room at `http://localhost:3100` (start it from `BAHN/build/control-room` with `npm run dev -- -p 3100` if it is down). Drive the control room headlessly (HTTP to `/api/agent`, or the browser tools); do not ask me to click.
- Run long commands in the background; inspect real state (executions, tables, logs) before calling something a failure.

## 3. What to run
1. TESTS.md groups A, B and C in order (tests 1 to 17).
2. Fresh-clone check: clone `https://github.com/tranminhkhoivas-jpg/bahn-car-delivery-control-room` into a new temp folder and follow its README step by step, copying only the root `.env`. Report every step that is wrong or missing. Do not wipe or replace the running n8n.
3. One end-to-end demo story per agent area that the demo uses (ferry sold out CD-420299, driver unwell CD-420537, one breakdown/incident with the 112 line): event in, plan shown, approve, mock bookings, buyer answer, driver notice.

## 4. Record results (master doc, same turn)
- `BAHN/TESTS.md`: mark each test PASS / FAIL / SKIPPED with one line of evidence (order ref, plan #, execution id).
- `ai-docs/features/F-004-bahn-entry.md`: overwrite the test results lines with current truth; add the CHANGELOG line and INDEX row update per PROTOCOL.md, with your exact model + harness tag.
- List leftover test plans/orders so the demo reset can clear them.

## 5. Final answer format
Start with this, nothing before it:

**TL;DR (plain words, 5 lines max):** ready for demo yes/no; how many tests passed out of how many; the worst problem in one sentence; what a person must decide; what is left before recording.

Then a table: test number | name | PASS/FAIL/SKIPPED | evidence | fix suggestion (failures only).

Then: fresh-clone README problems (numbered), then leftover test data to reset.

End with `Master doc: <what changed>`.
