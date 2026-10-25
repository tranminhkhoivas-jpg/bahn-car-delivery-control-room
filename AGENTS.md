## Indexing restrictions
Never index C: or D: drive roots or recursively scan whole drives. Never automatically index directories on either drive. Index only a specific repository explicitly named by the user in an indexing request. Inspection, research, installation and ordinary file work are not indexing authorization. Use scoped file searches or existing relevant graphs read-only.

## Plain-language TL;DR after every update - both tracks
The user must keep the whole project idea in their head at all times. Every reply that reports work, results or a change ends with a short **TL;DR in layman's terms** (3-6 lines, no code names, ids or jargon): what the product does now, what changed this turn and why, and what is still open. Name which part of the workflow each change belongs to (for example "the step where the agent waits for the buyer"). Any deviation from an agreed plan is announced BEFORE building it, with the reason, not reported afterwards.

## Proactive tool recommendations - both tracks
For any Bahn or Velho work, consult `ai-docs/features/F-007-hackathon-tool-shortlist.md` and its required context. This applies during brainstorming, research, design, building, testing, debugging, hosting, demo preparation and handoff, not only implementation.

Proactively recommend a listed tool whenever it meaningfully helps the current scenario, even if the user did not ask about tools, it is not installed, or its MCP is not exposed in this harness. Name the track, concrete input/job/output, benefit and simpler existing alternative when relevant. Do not recite the entire catalog or repeat suggestions without a new reason. Primary track fit is guidance, not a ban on useful cross-track reuse; explain the fit and preserve each track's rules.

Assume services work when comparing options; exclude only confirmed permanent discontinuations, not temporary outages or earlier connection failures. Keep recommendations separate from observed readiness. A recommendation does not select a stack or authorise installation, purchases, account connections, publication or outreach. F-005/F-006/F-009 own setup records; F-003/F-004 own track requirements. CLAUDE.md/GEMINI.md already import this file.

<!-- ai-master-doc-project:start v1 -->
## Master Doc (MANDATORY - ai-master-doc-project)

**Master doc location for THIS project (the only one you may use): `D:/my stuffs/Projects/hackathon/prompt hackathon operation/ai-docs`**
Never read or edit a master doc anywhere else, even if you see one. If this path does not exist, stop and tell the user.

The master doc is this project's feature memory AND handoff. It must let a different AI/model/chat take over instantly. Keep it true and current at all times.

### Every turn: READ
1. Read `INDEX.md` in the master doc folder (short; headings + one-line summaries). Do this before anything else, every turn.
2. New chat/model, or you lack project context: also read `PROJECT_BRIEF.md`.
3. Before touching or relying on a feature: read that feature's file in `features/` AND every feature linked (`[[F-###-slug]]`) under its "Read first".
4. Do NOT read anything else in the folder (other feature files, `CHANGELOG.md`, `PROTOCOL.md`) unless needed for the task. Exception: read `PROTOCOL.md` before your first doc write in a chat.

### What counts as a feature (document it)
Anything user-visible or behavior-affecting: auth/login providers, checkout/payments, legal pages, emails, DB schema, env/config, integrations, deployment, design system, SEO, admin tools, etc. Pure refactors/typo fixes: skip unless they change behavior, structure, or setup.

### Every change: WRITE (same turn, before you say "done")
- New feature -> create `features/F-###-slug.md` from `features/_TEMPLATE.md`, add its row to `INDEX.md`.
- Edited feature -> OVERWRITE the affected parts of its file so it states only current truth. Never append a "now changed to..." note. Delete or rewrite anything the change made false. Update its header (Last edited by, date, status).
- Replaced feature -> rewrite the file as the new truth; log what was replaced and why in `CHANGELOG.md`.
- Removed feature -> delete its file, set row to `removed` in `INDEX.md` (or delete row if never shipped), log in `CHANGELOG.md`.
- Always: add ONE line at top of `CHANGELOG.md`; update `INDEX.md` row (status, summary, last editor model, date); update `PROJECT_BRIEF.md` if goal, stack, how-to-run, or current state/next steps changed.
- After editing, search the master doc for old names/values you changed (other feature files, INDEX, BRIEF) and fix contradictions.
- Style: plain-language prose; exact names, paths, settings as `name: value`; short code snippets only where wording would be ambiguous; no pasted code dumps. NEVER write secret values (keys, secrets, tokens, passwords): write the env var NAME and where it is stored.
- Model tag: record exact model name + harness you actually are (e.g. "Claude Sonnet 5.5 via Claude Code"). If you do not know your exact model, ask the user; never guess or write "AI".
- Full procedures, status values, and templates: `PROTOCOL.md`.

### Pre-reply checklist (run silently before EVERY final answer that touched the project)
1. Did I add/change/replace/remove any feature, setting, or setup step? If yes, was its feature file updated (current truth only)?
2. Is the `INDEX.md` row correct (status, summary, model, date) and does every row have a file (and vice versa)?
3. `CHANGELOG.md` line added? `PROJECT_BRIEF.md` still accurate?
4. Any contradiction left anywhere in the master doc? Any secret value written?
If any answer is bad, fix it first. Then end your reply with one line: `Master doc: <what changed>` or `Master doc: no update needed`.
<!-- ai-master-doc-project:end -->
