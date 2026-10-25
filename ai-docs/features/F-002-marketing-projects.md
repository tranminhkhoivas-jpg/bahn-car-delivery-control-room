# F-002 - Marketing Hackathon past-project reference

- **Status:** partial
- **Built by:** gpt-6.1-sol via Codex, 2026-10-23
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last verified working:** Public write-ups, results and Meri Team slides read through Chrome extension 2026-10-23; implementations not validated.

- **Scope:** Shared reference
- **Scope reviewed:** 2026-10-24; document audit only. Earlier runtime/provider checks below were not repeated.

## Track scope
Historical September Marketing projects, available as inspiration for either track. Acquisition examples primarily inform Velho; none defines Bahn or Velho requirements, metrics or tool entitlements.

## Purpose (why this exists, tied to project goal)
Learn from September submissions, especially Meri Team's Content creation machine, to inform both Operations entries without copying unsupported claims or assuming a solution is already selected.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
Marketing Hackathon ran 26-27 September 2026 at Startup Sauna. Current official results reported 107 builders, 34 submitting teams, 48 projects and 46 live demos. The public project archive contained only seven voluntarily published projects; it is not the full submission set.

Mergero challenge: generate more sell-side and/or buy-side M&A mandates in Finland and internationally. EUR 2,000 winner: Mergero-Connect by La noche. Honourable mentions: VideoOutreachOS by bob the builder and Content creation machine by Meri Team. No public second/third ranking was found. The user confirmed Meri Team is the project they meant by the near-winning or third-place entry.

Prenew challenge: automate influencer collaborations, especially discovery of small/niche creators missed by existing tools. EUR 1,000 winner: Scout by click here for free cursor credits. Honourable mentions: V & A - Niche Creator Finder for Prenew and Treffer.

Tools page offered Cursor 2 x USD 35 per team (one for solo) and Biscuit USD 75/day per participant; these are September offers. It also supported hub MCP. Do not imply codes remain available.

## How it works (approach, flow in words, libraries/services used and why)
### Official source and rubric
- Results: https://prompthack.aaltoes.com/hackathon-03/results
- Archive: https://prompthack.aaltoes.com/hackathon-03/projects
- Mergero brief: https://prompthack.aaltoes.com/hackathon-03/challenges/mergero
- Prenew brief landing: https://prompthack.aaltoes.com/hackathon-03/challenges/prenew
- Tools: https://prompthack.aaltoes.com/hackathon-03/tools

Mergero allowed any technology, channels, partnerships or business models, and valued cracking one side concretely over touching everything lightly. Published rubric: innovation, scalability, feasibility, impact and concreteness, 20 points each. Judges said La noche stood out for an innovative business model for scaling sales rather than simply accelerating the existing process. Its detailed mechanism was not publicly established. No detailed public write-up for VideoOutreachOS was found either; do not infer either implementation from its name.

### Focus: Meri Team - Content creation machine / Mergero Engine / Talk to blog
- Write-up: https://prompthack.aaltoes.com/hackathon-03/projects/23e981b6-16e2-49ca-9b11-da6866c58239
- Slides folder: https://drive.google.com/drive/folders/1JrZe2-qyynBpWIAq08X-0H3NTiJmAyNn
- Slides filename: Talk to blog — Mergero.pdf; 11 pages read through Drive preview.
- Linked app: https://mergero-sourcing.vercel.app/studio/talk

Actors: the expert is a MERGERO ADVISOR, employed by the company trying to win business. Readers are potential sellers, owners, investors or buyers. The tool interviews the advisor, not an unknown prospect, to capture the advisor's own knowledge.

Team-described flow (implementation claims unverified): tap and talk; AI asks context-dependent follow-up questions; generate a draft from the recording/company data; trace claims to source passages or rows; human approves; produce blog and other formats. Six languages: Finnish, English, Swedish, German, Italian and French. Outputs include LinkedIn posts/carousels, newsletters, owner letters and video scripts. No automatic posting or sending is claimed.

Team-described controls (unverified): separate claim-checking pass, literal quote checking, confidentiality code before an LLM pass, no client/company names, money as ranges, groups of at least five and no identifying combinations. Added claims block publication pending human acceptance/removal.

Team-described stack (unverified): Next.js, Postgres/Drizzle, Claude and ElevenLabs; DataForSEO search demand; optional SE Ranking connector. Other described functions include anonymised meeting-note Q&A, article-topic extraction and a registry-based shortlist (16,868 Finnish IT companies narrowed to 772 established employers). These counts are team reports, not independently reproduced.

Pitch rationale: busy advisors have expertise but little writing time; a short conversation can capture useful original material; LinkedIn helps distribution and the website provides permanent articles. Structured data, authorship, dates, hreflang and llms.txt were described. These choices do NOT guarantee AI citations.

Evidence limits: team reported Mergero named in 0/40 answers from one Claude web-search run on 26 September. This does not establish visibility across all models, later improvement or acquisition impact. Slides mark example titles, claim colours and simplified screens as illustrative/mock-ups. Proposed repeat measurement and an 8-12 week pilot are future plans, not outcomes. Live app failed with a server error on research day; homepage redirected to the same failing studio route. No source repo was linked from this write-up.

### Other projects and transferable ideas
**Mergero Origination Desk - aBARofchocolate**
- https://prompthack.aaltoes.com/hackathon-03/projects/3b178c44-45ba-4f42-80f7-ca0f42e85c45
- Repo: https://github.com/tommy2006/mergerochocolate
- Video: https://youtu.be/ABe7LHd7RKg
- App: https://mergero-abarofchocolate.vercel.app/
Team describes public-register discovery in Norway/Finland/Denmark, sourced website/account research, rule-based timing signals, buyer matching, approved email/follow-up drafts, reply handling and pipeline tracking. Self-hosted Mistral Small 3 on a Verda GPU is claimed. Write-up explicitly separates real companies/accounts from sample buyer mandates and redirects test emails to the team's inbox; says API access switched off 28 September. No implementation or outcomes independently tested. Useful lesson: show why a particular company is relevant and preserve the evidence through the conversation, not merely a generic lead score.

**Mergero self assessment - Jeremias**
- https://prompthack.aaltoes.com/hackathon-03/projects/441ee11a-1bc7-4407-9137-a9aac4ad250b
- Repo: https://github.com/JAPARK10/promptmarketinghackathon
Short write-up describes an early-stage tool for owners to learn about selling, including company evaluation, an AI buyer conversation and information. Only concept/architecture described; no working behavior verified. Useful lesson: offer a relevant customer-facing entry point, then establish fit through discovery. It does not prove an automation diagnostic works for Velho.

**Prometheus**
- https://prompthack.aaltoes.com/hackathon-03/projects/7ee60c91-bf0c-4344-9d0f-f2f0e2751b84
- Repo: https://github.com/Abdullah12has/prometheus
- Video: https://youtu.be/L1J9de2VvEg
Team describes research, voice conversations, buyer/owner condition matching and approved outreach, plus a Dream-RSI learning mechanism. Broad autonomous operation is an aspiration, not verified. Useful as a workflow map; breadth risks a weak weekend demonstration.

**Prenew Creator Scout - No Man Is An Island, But This Woman Is**
- https://prompthack.aaltoes.com/hackathon-03/projects/0ab9b0b9-317e-4fca-9c2c-61de536a7231
- Demo/slides: https://prenew-challenge.lovable.app/ and https://prenew-challenge.lovable.app/demo/1
Team describes seed-based creator discovery, transparent fit factors, audience-comment evidence, Sheets-based triage, known-partner flags and learning from accepted candidates. Reports 1,898 creators/11 countries, about USD 1 per market run, 6/9 withheld Finnish partners and weaker Polish recall. These are team claims, not reproduced. Useful lesson: explain matches, measure against held-out known examples, disclose misses, and let the operator correct the shortlist. Do not use claimed metrics as Velho benchmarks.

**Prenew Radar - Dreamers**
- https://prompthack.aaltoes.com/hackathon-03/projects/dee69afa-be1f-4c13-b945-eb040b932a7e
- Repo: https://github.com/KALalev18/prompt-hackathon
Describes country/platform selection, local-language discovery, recent views, game/brand-safety classification, public contacts and CSV export. Claims such as 10x expansion and zero wasted outreach were not validated. Useful lesson: concrete filters and export aid adoption; avoid unsupported absolute impact claims.

## Files and locations (REQUIRED)
- `ai-docs/features/F-002-marketing-projects.md`: dated research, past-project references and lessons.

## Setup and config (everything needed to recreate it)
No past project installed, executed, forked or connected. Browser used read-only. Linked repos/videos were identified but not audited or watched; slides were read. No external credentials stored.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Source links, public project descriptions and clearly attributed claims only. No raw prospect data, private notes or user account identifiers copied here.

## Read first / Depends on (REQUIRED)
none

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
These projects inform decisions; none is an approved solution for either track. Distinguish good presentation from verified execution. Meri's content-to-trust mechanism is relevant to Velho, but content is not evidence of booked meetings. User challenged the assistant's vague diagnostic extension and unsupported pre-contact automation conclusions; preserve that correction.

## How to verify (steps to confirm it works)
Open cited write-ups/results/slides. For implementation claims, inspect the relevant repo and run the actual workflow separately if later requested. Recheck failed demos rather than promising they work. Obtain the winner's actual materials before explaining its business model in detail.

## Open TODOs (unfinished work and next steps for this feature)
Get missing winner/honourable-mention materials if useful; no need to delay track discovery for this. Evaluate selected techniques against the actual Operations rubrics and available data. Measure business outcomes if a pilot happens; never treat future pilots as completed evidence.
