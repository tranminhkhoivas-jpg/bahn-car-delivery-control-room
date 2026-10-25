# F-008 - Challenge source files (Bahn, Velho and shared)

- **Status:** partial
- **Built by:** claude-haiku-5-5 via Claude Code, 2026-10-24
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last verified working:** 2026-10-24; paths below re-checked by listing the folders; Bahn repo copy has 229 files; Bahn deck and the eight Bahn context photos read. Nothing executed.

- **Scope:** Shared
- **Scope reviewed:** 2026-10-24; document audit only. Earlier runtime/provider checks below were not repeated.

## Track scope
Inventory of separately scoped source materials. Bahn files, Velho files and shared event files are grouped below; a shared container does not make every contained rule apply to both tracks.

## Purpose (why this exists, tied to project goal)
Keep the released challenge materials for both partner tracks in the project, so briefs, data and starter code can be read offline and cited. Bahn and Velho each get their own folder; material that applies to both sits at the project root.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
n/a for end users; these are reference files. They are copies of public material on the hub and partner repos, saved on 2026-10-24. They are not verified against any later revision.

## How it works (approach, flow in words, libraries/services used and why)
Files were fetched without running anything. The Bahn repo was cloned shallowly from https://github.com/Bahn-Express/car-delivery-control-room, its `.git` folder removed, and the rest copied. The Velho and Bahn PDFs came from the public links shown on the hub's challenge page. Event info was copied from the hub's info page through the browser. The Matrix OS entry comes from the hub's challenge data through the `prompthack` MCP.

Untrusted code: `BAHN/context/car-delivery-control-room/check_packet.py` and everything under `starter/` are stored as data. Do not run them without reading them first.

## Files and locations (REQUIRED)
### Bahn-only source files

- `BAHN/context/`: all Bahn challenge files; nothing sits directly in `BAHN/`.
- `BAHN/context/Bahn-hackathon-deck.pdf`: Bahn slides from the hub, 13 pages (4-page brief is in the repo copy below).
- `BAHN/context/car-delivery-control-room/`: Bahn challenge repo copy (no `.git`). Key files: `README.md`, `PARTICIPANT-BRIEF.md`, `OPERATIONS-CONTEXT.md`, `Bahn-hackathon-brief.pdf`, `dataset/` (synthetic orders and events, with `SCHEMA.md`), `attachments/`, `mockups/`, `starter/` (optional Next.js and Postgres app).
- `BAHN/context/*.jpg`: eight phone photos of the Bahn opening-ceremony slides (deck pages 2-8 and 13); no content beyond the deck.
### Velho-only source files

- `velho/context/`: all Velho challenge files; nothing sits directly in `velho/`.
- `velho/context/Velho-challenge-brief.pdf`: Velho brief from the hub (4 pages).
- `velho/context/Velho-slides.pdf`: Velho slides from the hub (4 pages).
- `velho/context/*.jpg`: four images already in the folder before the download.
### Shared event sources and mixed recording

- `EVENT-INFO.md`: shared event info (food, demos and judging, venue, submitting, FAQ and contacts) from the hub info page. Applies to both tracks.
- `MATRIX-OS-CHALLENGE.md`: shared Matrix OS tool challenge (prize and brief) from the hub. Either track can enter it.
- `transcript.txt` and `Voice.m4a` (project root, already present): opening-ceremony recording and transcript. The opening Speaker 1 block and its Q&A are Bahn-only; Speaker 4 is Velho-only; Matrix OS and organiser announcements are shared. The transcript later reuses Speaker 1 for Matrix OS, so the speaker number alone does not establish the track. Not created or changed by this feature.

## Setup and config (everything needed to recreate it)
n/a. To recreate, clone `https://github.com/Bahn-Express/car-delivery-control-room`, delete `.git`, and download the four PDF URLs listed on the hub challenge page (`https://prompthack.aaltoes.com/hackathon-04/challenges`).

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Public challenge materials and synthetic Bahn data (the repo says all of it is made up). No real customer, driver or order data. The Velho brief forbids contacting real companies or publishing in Velho's name without checking first; the copies do not change that.

## Read first / Depends on (REQUIRED)
[[F-003-velho-entry]] - Velho brief and rules.
[[F-004-bahn-entry]] - Bahn-only entry, released brief and rules; the old intake template is obsolete.
[[F-001-operations-event]] - event facts that the shared files repeat.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
- The Bahn repo's `Bahn-hackathon-brief.pdf` is byte-identical to the hub copy, so only one copy is kept.
- The hub's live challenge data may change before judging; re-download if a brief is marked updated.
- `EVENT-INFO.md` is a copy of a live page. Its schedule and room lines still say TBA where the page does.

## How to verify (steps to confirm it works)
1. `file` on each PDF reports a PDF document.
2. `BAHN/context/car-delivery-control-room/Bahn-hackathon-brief.pdf` and the hub brief compare equal.
3. Read `EVENT-INFO.md` against https://prompthack.aaltoes.com/hackathon-04/info.

## Open TODOs (unfinished work and next steps for this feature)
- Bahn only: decide whether to use the supplied starter; review it before installing dependencies. No Velho starter app is listed in this inventory.
- Re-download if the hub publishes revised briefs.
