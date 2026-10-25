# Protocol: how to maintain this master doc
Read before your first doc write in a chat. Goal: any AI can take over cold, nothing contradicts, nothing stale.

## Principles
1. **One truth per fact.** Each fact lives in exactly one place (its feature file). Other places link to it, never copy.
2. **Overwrite, don't append.** Feature files describe the CURRENT state only. When something changes, rewrite that part. History belongs only in `CHANGELOG.md`.
3. **Comprehensive but relevant.** Include everything a successor needs to operate, change, or rebuild the feature. Exclude anything derivable by reading the code in seconds, and exclude pasted code dumps.
4. **No secrets.** Env var NAMES and where they are stored. Never values.
5. **Honest status.** `working` only if verified. Unverified claims say `(unverified)`.

## Track scope (shared maintenance rule)

Scope reviewed: 2026-10-24 by gpt-6.1-sol via Codex.

- Every feature must declare `Scope: Bahn only`, `Scope: Velho only`, `Scope: Shared` or `Scope: Shared reference` in its header and explain its boundaries under `Track scope`. Keep the INDEX feature label consistent.
- Mixed shared files must label track-specific sections, examples, permissions and source groups. A dependency link means context to read, not permission to copy its rubric, data or product decisions into another track.
- Shared tooling is available infrastructure, not a chosen application stack. Keep readiness evidence separate from product verification and name which track a workflow belongs to.
- PROJECT_BRIEF handoff must separate Bahn, Velho and shared work. Shared event rules apply to both; partner-specific deliverables and judging stay in F-003/F-004.
- F-004's Bahn-only AI work record is an ongoing evidence record explicitly requested by the user. It may overlap with feature details; retain accurate iteration evidence and correct inaccurate entries. Other sections still describe current truth. Do not file Velho work under Bahn's 30% criterion.
- Preserve dated source verification when editing documentation. A document-scope audit does not reverify services, credentials, prices or live behavior.

## Feature IDs and files
- ID = `F-###` (zero padded, never reused). File = `features/F-###-short-slug.md`. Slug may be renamed with the title; ID never changes.
- Granularity: one feature = one thing a person would describe separately ("Google & Meta login", "Terms & Privacy pages", "Stripe checkout"). Split if the file gets confusing; merge tiny ones.

## Links between features
- Write links as `[[F-###-slug]]` (the exact feature file name without `.md`, Obsidian style; open `ai-docs/` as an Obsidian vault to see the graph). The check fails on a link to a file that does not exist.
- "Read first / Depends on" must list the features this one relies on as links, or say `none`. Only forward links: "linked from" (backlinks) is computed by the hooks from everyone's links, never written by hand.
- "Files and locations" is required: every file/folder of the feature in backticks, relative to the project root. When you edit a code file, a hook tells you which feature lists it and what it links to; if no feature lists it, add it.
- When a feature ID or slug is renamed, update every `[[...]]` that pointed to it.

## Procedures
**Add:** copy `features/_TEMPLATE.md`, fill every section (write "n/a" rather than deleting a section), add INDEX row, CHANGELOG line (`added`), update BRIEF section 7 if state changed.
**Edit:** open file, change ONLY what is now different, rewriting sentences in place. Update header `Last edited by` + `Last verified`. Fix INDEX row. CHANGELOG line (`edited`). Search other docs for the old names/values and fix.
**Replace (new approach supersedes old):** rewrite the whole file as the new truth. Keep `Built by` as the original builder only if still substantially true; otherwise set it to the new builder. CHANGELOG line (`replaced`) states old approach, new approach, why.
**Remove:** delete the file, mark INDEX row `removed` (or delete row if it never shipped), CHANGELOG line (`removed`), remove `[[...]]` links to it from other features (the check fails on dead links).
**Split/merge/rename:** update INDEX, every `[[...]]` link, CHANGELOG.
**Audit existing project:** per BOOTSTRAP step 6; mark `Built by: unknown (reconstructed ...)`.

## Model tags
- `Built by` = model+harness that first built it (kept unless replaced). `Last edited by` = model+harness of the latest edit, with date.
- Use the exact tag the hook gives you each turn ("You are: <model id> via <harness>"), e.g. `claude-opus-5-5 via Claude Code`, `gpt-6-luna via Codex`. The check rejects a CHANGELOG line or "Last edited by" that lacks your model id and harness name. If no tag was given, use your exact model name plus harness; if unsure, ask the user once.

## Several AI chats at once
Other chats may be editing this project and this doc at the same moment. You are checked only on files changed while your own tools ran. Re-read a doc file right before editing it, touch only your own rows/sections/lines, and never revert or "fix" a line another chat just wrote.

## INDEX row rules
Summary max ~15 words. Status from the allowed list. "Depends on" = IDs. Keep rows sorted by ID. INDEX must never contain details that belong in a feature file.

## Feature file section guide (see `_TEMPLATE.md`)
Header (status, who, when) -> Purpose -> Behavior (user-visible) -> How it works -> Files and locations -> Setup and config (provider console steps, settings, scopes, redirect URLs, env var names) -> Data -> Read first / Depends on -> Decisions and gotchas -> How to verify -> Open TODOs.

## Contradiction sweep (after every edit)
Search the master doc for any old name, value, URL, library, or behavior you just changed. Fix every hit. Re-read your feature file once: does any sentence conflict with another?
