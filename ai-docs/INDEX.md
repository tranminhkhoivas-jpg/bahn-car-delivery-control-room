# prompt hackathon operation - Master Doc INDEX
<!-- READ THIS FILE EVERY TURN. Keep it short: one line per feature. Details live in features/. -->

- **Project in one line:** Prepare and build entries for both Velho and Bahn Express at Prompt Operations Hackathon.
- **Current state:** Both briefs released and saved locally. Bahn: On-the-road router + 8 problem workflows (ferry/train/flight, replacement drivers, urgent escalation, buyer wake-up) working in local n8n (F-010); control-room site (F-012) built, live-tested and building. Velho: baseline audit complete (F-013); confirmed-defect repairs verified (F-017), following the historical skeptical assessment (93/140; F-016) and constructive assessment (F-014); media/video deferred; protected local server running; previous public test link unavailable; submission pending. OpenRouter and Fastino keys verified by live calls; event-credit binding and expiry still unconfirmed.
- **Master doc created:** 2026-10-23 by gpt-6.1-sol via Codex
- **Other files (read only when needed):** `PROJECT_BRIEF.md` (vision, stack, how to run, handoff state) | `PROTOCOL.md` (how to edit this doc) | `CHANGELOG.md` (history) | `features/F-###-slug.md` (one per feature)

## Track routing

**Tools in every phase:** consult F-007's track-labeled catalog and scenario lookup during brainstorming, research, design, building, testing, debugging, hosting, demos and handoff. Recommend fitting tools proactively, including uninstalled options; preserve track rules and distinguish recommendations from setup authorisation.

- **Bahn only:** F-004, F-010 (On-the-road n8n agent), F-012 (control room site), F-015 (Telegram messaging). Its AI work record, synthetic-data rule, approval gates, 40/30/30 rubric and required video belong only to Bahn.
- **Velho only:** F-003, F-011 (Velho Room app), F-013 (employee audit). Its acquisition goal, 50/50 spoken weighting, outreach/publication permissions and submission instructions belong only to Velho.
- **Shared:** F-001 event logistics; F-005 tool/access setup; F-006 optional Fastino research; F-007 optional tool shortlist; F-008 source inventory with separately labeled contents; F-009 Matrix OS cloud workspace.
- **Shared reference:** F-002 historical Marketing projects. Inspiration only, primarily relevant to Velho acquisition; no current track requirements or claimed results transfer from it.
- **Shared maintenance:** PROJECT_BRIEF.md, PROTOCOL.md and features/_TEMPLATE.md cover both entries. CHANGELOG.md is history; current feature files take precedence.

Shared means applicable infrastructure or event context for both entries, not a common product or common rubric. Follow linked dependencies for context without importing the other track's rules. Exact requirements live in each track file.

## Feature list
Status values: planned | in-progress | working | partial | broken | deprecated | removed

| ID | Feature / scope | Status | One-line summary | Depends on | Last edited by (model, date) | File |
|----|---------|--------|------------------|------------|------------------------------|------|
| F-001 | Operations event research (Shared) | partial | Event logistics for both entries; partner announcements explicitly scoped. | none | gpt-6.1-sol via Codex, 2026-10-24 | features/F-001-operations-event.md |
| F-002 | Past projects reference (Shared reference) | partial | Historical inspiration, mainly Velho acquisition; no current-track requirements. | none | gpt-6.1-sol via Codex, 2026-10-24 | features/F-002-marketing-projects.md |
| F-003 | Velho entry (Velho only) | in-progress | Acquisition requirements; Oskar endorses synthetic CRM/project notes for the demo; outreach remains draft-only. | F-001, F-002, F-011 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-003-velho-entry.md |
| F-004 | Bahn Express entry (Bahn only) | in-progress | On-the-road agent/control room built; test groups A and C demo tests (8, 11, 17) pass, README n8n start fixed, repo decided (public bahn-car-delivery-control-room) but not created yet; representative says cross-delivery optimization out of scope; answered language (usually English), delivery-site note (email) and recovery (Redgo in Finland). | F-001, F-008, F-010 | claude-opus-5-5 via Claude Code, 2026-10-25 | features/F-004-bahn-entry.md |
| F-005 | Local MCP and web research tools (Shared) | partial | Shared tools/access; OpenRouter and Fastino keys verified live; MCP partial-update bug noted. | none | claude-opus-5-5 via Claude Code, 2026-10-24 | features/F-005-n8n-mcp-local.md |
| F-006 | Fastino readiness (Shared) | partial | Native extraction/support checks pass; Velho source-review integration expanded; broader accuracy unverified. | F-005 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-006-fastino-readiness.md |
| F-007 | Hackathon tool shortlist (Shared) | partial | Track-labeled catalog and proactive scenario recommendations across every phase of work. | F-005, F-006, F-003, F-004, F-008, F-009 | gpt-6.1-sol via Codex, 2026-10-24 | features/F-007-hackathon-tool-shortlist.md |
| F-008 | Challenge source files (Shared) | partial | Bahn, Velho and shared source groups; transcript blocks explicitly attributed. | F-003, F-004, F-001 | gpt-6.1-sol via Codex, 2026-10-24 | features/F-008-challenge-source-files.md |
| F-009 | Matrix OS cloud workspace (Shared) | partial | Optional remote workspace; migration, credentials and published VM specs documented; account allocation unverified. | F-005, F-008 | gpt-6.1-sol via Codex, 2026-10-24 | features/F-009-matrix-os-shared.md |
| F-010 | Bahn On-the-road agent, n8n (Bahn only) | working | Router + 8 agents, code tools, one plan per order; Langfuse prompts, prompt-fix test, 25-case Promptfoo suite (routing on live code); agent context trimmed so long cases no longer give empty replies; driver notice names the buyer's chosen option; checks before booking block approval; 112 line sent first (live-checked); safety question may repeat once (timing; accepted for the demo). | F-004, F-005, F-006 | claude-opus-5-5 via Claude Code, 2026-10-25 | features/F-010-bahn-on-the-road-n8n.md |
| F-011 | Velho Room app (Velho only) | working | Protected app; confirmed-defect repairs verified in F-017; deferred media/song preserved. | F-003, F-005, F-007, F-013 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-011-velho-room-app.md |
| F-012 | Bahn control room site (Bahn only) | working | Starter fork on PGlite; Needs a person queue plus agent case: plan options, approve now or ask buyer first, state banners, your name, staff time zone, driver message box, reminder approvals, which-order panel, Telegram conversation with media links, incident task buttons, one-click updated-offer notice; Settings page. | F-010, F-004, F-008 | claude-opus-5-5 via Claude Code, 2026-10-25 | features/F-012-bahn-control-room-site.md |
| F-013 | Velho employee audit (Velho only) | partial | All 15 exercised; 23 regression, 21 fresh and 18 public checks pass; manual limits remain. | F-011, F-003, F-007 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-013-velho-employee-audit.md |
| F-014 | Velho constructive improvements (Velho only) | working | Historical constructive 126/140; skeptical review in F-016, confirmed-defect repairs in F-017. | F-011, F-013, F-003, F-007, F-006 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-014-velho-improvement-stage.md |
| F-015 | Bahn Telegram messaging (Bahn only) | working | Bot offers, driver/staff messages, sim people, reminders, translation, order linking, reopen check, photo/voice reading. | F-010, F-006 | claude-opus-5-5 via Claude Code, 2026-10-25 | features/F-015-bahn-telegram-messaging.md |

| F-016 | Velho skeptical audit (Velho only) | working | Historical review: 93/140; confirmed-defect repairs now tracked in F-017. | F-003, F-011, F-013, F-014, F-007, F-006 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-016-velho-skeptical-audit.md |

| F-017 | Velho confirmed-defect repairs (Velho only) | working | Confirmed defects repaired; targeted/full regressions, production build, runtime and browser checks pass. | F-016, F-011, F-013, F-003, F-006, F-007 | gpt-6.1-sol via Codex, 2026-10-25 | features/F-017-velho-defect-repairs.md |

## How to use this index
- Changing or relying on a feature? Open its file, plus its "Read first" files.
- New feature? Next free ID = highest ID + 1. Add the row here AND create the file.
- Keep rows sorted by ID. Every row must have a file; every file must have a row.
