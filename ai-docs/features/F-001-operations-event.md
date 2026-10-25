# F-001 - Operations event research

- **Status:** partial
- **Built by:** gpt-6.1-sol via Codex, 2026-10-23
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last verified working:** Official challenges page and public Telegram channel read through Agent Reach/Jina; challenges page also passively inspected with REA on isolated Chrome 155 on 2026-10-24. Briefs were released at the opening ceremony that day (Bahn files read locally by claude-opus-5-5).

- **Scope:** Shared
- **Scope reviewed:** 2026-10-24; document audit only. Earlier runtime/provider checks below were not repeated.

## Track scope
Event rules and logistics for both tracks. Partner-specific announcements are labeled below and do not become rules for the other track.

## Purpose (why this exists, tied to project goal)
Shared event facts for preparing both entries. Facts below were researched in this chat on 2026-10-23; recheck before relying on deadlines, tool access or unreleased details.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
Prompt Operations Hackathon is 24-25 October 2026 at Startup Sauna, Puumiehenkuja 5a, Espoo. The user confirmed on 2026-10-23 that Luma approval and access to My team and Discord are working; this is user-reported, not independently inspected. Teams may have up to five people, solo participation is allowed, and My team accepts multiple challenge picks.

The current live challenge page, read by Agent Reach/Jina and observed through REA in Chrome on 2026-10-24, lists Bahn Express (€2,000) and Velho (€1,000); both briefs and judging criteria are released after the Saturday 10:00-11:00 opening ceremony. At 06:41 UTC (09:41 EEST), the public page still showed “brief at the opening ceremony.” The separately judged Matrix OS tool challenge offers three months of Matrix plus USD 300 in AI credits for each winning team member. Luma's event blurb still says only Bahn, and a web-indexed copy of the challenge page still says “coming soon”; these appear older than the live hub view. Both briefs were released at the opening ceremony on 2026-10-24 and are saved locally; the Bahn brief and rubric are summarised in [[F-004-bahn-entry]].

**Shared announcement / Velho-only teaser:** The public Prompt Aaltoes Telegram channel's October 17 post says the Operations weekend will build working agentic solutions for real company operations and demo them Sunday; examples include invoices, scheduling, reporting and handoffs between teams. The October 22 Velho post describes its separate challenge as getting Velho seen by the right companies or in the room with them. It does not provide a Bahn-specific process or brief.

The schedule lists Saturday doors at 09:00, opening at 10:00, hacking at 11:00, challenge picks at 18:00, and doors closing around 23:00. The info page says overnight work depends on 24-hour Startup Sauna access; otherwise doors reopen at 08:00 Sunday. Sunday demos run 15:10-17:15, usually 5-10 minutes per team, with exact room and time on My team. The submission deadline is shown as Sunday 15:00 and all schedule times are labelled EEST.

Finland's Government says clocks move from EEST back to EET at 04:00 on Sunday 25 October 2026. If the deadline is fixed EEST, 15:00 EEST is 14:00 Helsinki wall-clock time; if it means local wall-clock time, it is 15:00. Ask an organiser to clarify the cutoff. Until confirmed, set the team's own deadline to 13:00 Helsinki time; that is a conservative buffer, not an official correction.

The event info requires a separate write-up for each selected challenge: what it does, how it works, screenshots, demo/repository links and enough detail for judges to run it. The deadline is strict; organizers may disqualify a winning laptop demo changed after submission. Pre-existing code is allowed if disclosed; judges emphasize weekend work. Prepare a screen recording or screenshots as backup, bring a charged laptop and charger, leave the demo open, have one person talk and one drive, and arrive five minutes before the assigned demo. The info page says to be honest about what was built and prohibits undisclosed AI-generated submissions. If the hub is down near the deadline, email the submission as the page instructs.

## How it works (approach, flow in words, libraries/services used and why)
Sources:
- Home: https://prompthack.aaltoes.com/hackathon-04
- Registration: https://luma.com/aaltoes-gapx
- Schedule: https://prompthack.aaltoes.com/hackathon-04/schedule
- Rules: https://prompthack.aaltoes.com/hackathon-04/info
- Challenges: https://prompthack.aaltoes.com/hackathon-04/challenges
- Partners: https://prompthack.aaltoes.com/hackathon-04/partners
- Tools: https://prompthack.aaltoes.com/hackathon-04/tools
- Finland clock-change notice: https://valtioneuvosto.fi/en/-/1410829/clocks-go-back-on-sunday-25-october
- Telegram announcement channel: https://t.me/s/promptaaltoes
- Velho announcement: https://t.me/promptaaltoes/22
- Prompt LinkedIn announcements: https://fi.linkedin.com/company/aaltoesprompt

**Partner-specific prize records:** The recorded challenge-page read lists Bahn at EUR 2,000 and Velho at EUR 1,000. The October 22 Velho Telegram post advertised EUR 3,500 in cash and credits; the mismatch is unresolved, so do not combine or convert the totals. Ask the organisers or Velho if prize details matter. The Operations Telegram teaser is general and does not add Bahn-specific rules.

The Tools page describes an optional editor-to-hub MCP connection that can read the schedule and briefs and help check, write and submit a write-up. Setup creates a personal key; never share it or commit it. Shared event access: Claude Code hub setup and read-only verification are recorded in F-005. The organiser announces USD 20 of OpenRouter credit per participant in the closing part of `transcript.txt`; account binding, expiry and authentication remain unverified. September Cursor/Biscuit offers do not establish October offers.

## Files and locations (REQUIRED; every file/folder of this feature as a `path` in backticks, relative to the project root, folders end with /; plus routes, functions, DB tables; one line each on its role. Hooks use these paths to tell the AI which feature an edited file belongs to)
- `ai-docs/features/F-001-operations-event.md`: event facts and provenance.

## Setup and config (everything needed to recreate it)
Shared setup: F-005 records the existing Claude Code event-hub MCP connection using `PROMPTHACK_KEY` in the Windows user environment, verified read-only on 2026-10-24. This is not evidence of a Codex hub connection or a submitted entry. Do not expose credential values. Shared n8n and provider setup also belongs to F-005.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Public event facts and links only; no credentials. Agent Reach Exa search and Jina reads succeeded with network escalation. REA passively inspected the live challenges page on 2026-10-24 and confirmed the two partner/prize cards. Search-index and Luma copies still show the earlier Bahn-only state. The Telegram channel supplies the general Operations teaser and the separate Velho partner post; it does not state a Bahn-specific brief.

## Read first / Depends on (REQUIRED; links to features this relies on, written [[F-###-slug]] = exact feature file name without .md, one per line with a short reason; or the word none. Backlinks are computed by the hooks, never write them)
none

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
The current live hub lists both partner tracks; older Luma and indexed copies still show Bahn only. Partner-specific judging criteria, data and constraints live in each track's feature file, not here. Do not import Marketing rubrics into Operations as rules. Rules can change; this is a dated research snapshot.

## How to verify (steps to confirm it works)
Confirm the intended Helsinki-local Sunday cutoff and resolve the Velho Telegram prize discrepancy if relevant. Check the assigned demo slot/room and any tool-access instructions in My team.

## Open TODOs (unfinished work and next steps for this feature)
Confirm the Sunday deadline clock and clarify the Velho prize mismatch if relevant.
