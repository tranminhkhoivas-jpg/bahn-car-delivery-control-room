# F-007 - Hackathon tool shortlist

- **Status:** partial
- **Built by:** gpt-6.1-sol via Codex, 2026-10-23
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last verified working:** 2026-10-24; prior source research retained; cross-agent track/scenario recommendation guidance added and documentation validated. No new service integration tested.

- **Scope:** Shared
- **Scope reviewed:** 2026-10-24; requirements-based tool research for both tracks; earlier runtime/provider checks not repeated.

## Track scope
Optional tool research for both tracks, with each candidate labeled by fit. Shared availability does not mean either track has selected, installed or tested the tool.

## Bahn scope clarification - tool recommendations
On 2026-10-24, Tuukka - Bahn treated cross-delivery global optimization as out of scope and rare; source and exact wording are in [[F-004-bahn-entry]]. Retain OR-Tools below as a conditional research reference, not an active recommendation for this challenge. Do not prioritize a shared ferry-slot allocation or multi-driver optimization demo. Independent-case concurrency is a separate requirement.

## Agent instructions - use throughout the work
User explicitly requests both potential-tool lists to guide any agent in any context: brainstorming, research, design, building, testing, debugging, hosting, demos and handoff. Consult this catalog before choosing an approach or troubleshooting a relevant problem. Do not wait for a tool question or restrict recommendations to installed tools/currently exposed MCPs.

For a relevant suggestion, state track, problem, tool, concrete input/output and expected benefit; mention overlap or a simpler existing alternative when useful. Recommend the smallest fitting set. Avoid repeatedly recommending the same tool without new reason. The user assumes services work; exclude only confirmed permanently discontinued offerings, not temporary outages. Keep that assumption separate from installation/authentication/verification records.

Primary track labels below explain current brief fit, not exclusive ownership. Shared tools work across both tracks. A tool mainly listed for one track may be recommended for a concrete scenario in the other, with an explanation and without importing the other track's rules. Recommendation does not mean stack selection or authorisation to install, purchase, connect accounts or contact/publish externally.

### Track ownership and practical use
| Tool / capability | Primary track fit | Recommend when it helps with... |
|---|---|---|
| n8n | Shared | Background agents, integrations, approvals and scheduled tasks in either entry. |
| AI SDK | Shared; direct fit with Bahn Next.js starter | App-integrated model calls, tool loops, streaming and approvals; also Velho interactive tools. |
| LangGraph | Shared; complex Bahn cases especially | Explicit branching, checkpointed state and pause/resume; alternative runtime, not a mandatory extra layer. |
| OpenRouter | Shared | Generative/tool-capable models, structured outputs and supported vision. |
| GLiDE v1.2 | Shared | Defined choices, scores and escalation judgments based on supplied facts. |
| GLiNER | Shared | Extracting fields and records from text; classification when suitable. |
| Promptfoo | Shared; strong Bahn regression fit | Repeatable model/prompt cases, output and tool assertions; Velho sourcing/output checks too. |
| Langfuse | Shared | Runtime traces, error diagnosis, latency/cost comparisons and evaluations; separate from coding-agent work evidence. |
| Vapi / browser voice | Bahn calls/support; Velho buyer simulator | Fictional seller/driver conversations or simulated buyer practice, with transcripts and tools. |
| Docling / OCR | Shared | Bahn paperwork or Velho reports/project notes: documents into text/tables. |
| Vision-capable model | Shared | Bahn supplied photos/documents or Velho booth-photo/visual inputs, with evidence checks. |
| Stagehand / Browserbase | Bahn simulated travel portals; shared UI interactions | App-side permitted browser tasks; Stagehand operates and Browserbase hosts. |
| openrouteservice | Bahn travel | Estimated road times/distances, not ferry timetables or actual driver locations. |
| OR-Tools | Bahn scheduling | Candidate assignments under explicit constraints if this area is selected. |
| Exa / Agent Reach / Jina | Velho discovery; shared development research | Finding/reading sources and researching tools; development access differs from app API access. |
| Firecrawl | Velho company research; shared web inputs | Collecting selected website content with source URLs. |
| Exa Agent / Websets | Velho research/list building | Source-backed company profiles, candidate lists, criteria and enrichment. |
| changedetection.io | Velho signals/timing | Dated website changes that justify research or follow-up. |
| PRH/YTJ | Velho identification | Finnish business identity/basic register facts, not a phone/email directory. |
| TED Search | Velho procurement signals | Published procurement requirements and dates; eligibility still needs checking. |
| HeyGen | Velho media/campaigns | Approved scripts/assets into personalised videos and template variations. |
| Composio | Shared; especially Velho handoff | Authorised inbox/calendar/CRM actions; alternative to n8n/direct APIs. |
| Matrix OS | Shared | Persistent remote development/hosting; provider access is separate. |
| CUA Chrome / REA | Shared research/development/verification | Allowed browser work; REA is passive and origin-restricted. Not automatically app-side browser infrastructure. |

### Scenario lookup - any phase
| Current scenario | Tools to consider | Useful recommendation |
|---|---|---|
| Brainstorming directions | Relevant track tools above; brief first | Explain a feasible mechanism, actors and example output; keep concept selection with the user. |
| Researching a new company | Exa/Agent Reach, Exa Agent, Firecrawl, PRH/TED; Docling for reports | Gather dated sources and unknowns; mainly Velho. |
| Designing approvals and agent handoffs | n8n or AI SDK or LangGraph, database | Map read/ask/propose/approve/resume and current-state checks; mainly Bahn. |
| Building extraction, decisions or media | GLiNER, GLiDE, Docling, vision, HeyGen | Match desired output to the right tool; do not force every task through one model. |
| Testing prompts/models/regressions | Promptfoo, deterministic app tests, Langfuse | Compare expected behavior and actual effects, including approvals and source accuracy. |
| Debugging a bad proposal/output | Langfuse, source inspection, Promptfoo | Find the bad input or step, correct it and rerun the relevant cases. |
| Voice/travel/interaction testing | Vapi, Stagehand, simulated tools and replies | Use representative fictional scenarios for Bahn and preserve Velho contact permissions. |
| Repeated signal monitoring | changedetection.io, Exa monitors, n8n, optional GLiDE | Record a dated change and its relevance; mainly Velho. |
| Hosting or transferring work | Matrix OS, documented runtime/data seed | Check requirements and move intended code/data/config deliberately. |
| Demo preparation/handoff | Relevant runtime, replayable cases, traces, master doc | Show an end-to-end outcome; separately retain coding-agent corrections for Bahn's process criterion. |

## Purpose (why this exists, tied to project goal)
Find useful additions to the existing tools for either track. Both briefs are released. Select capabilities after choosing the relevant track workflow; do not install everything. Setup effort below is an engineering estimate, not measured time.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
User instruction on 2026-10-24: assume services are working for tool selection. Do not exclude a service for temporary outages, local DNS errors or lack of a smoke test; exclude only confirmed permanent discontinuations. This assumption governs recommendations, not observed readiness. No candidate below was excluded for downtime. Lower priority means weaker brief fit, duplication or extra implementation work, not service unavailability.

Current priorities: Bahn needs a real tool-using agent, approvals, evidence and an operator interface; Velho needs an original acquisition mechanism that runs live on a company selected by judges. Detailed ranked choices are below. Tools support the selected workflow; they do not establish hidden customer needs or select either entry's product.

Plain-language input/output examples (hypothetical, not executed): Firecrawl takes website URLs and returns readable page content; openrouteservice takes two locations and returns an estimated road journey duration/distance; Docling takes a scanned PDF and returns its text/tables; Composio gives an app authorised actions such as reading a demo inbox or creating a calendar event; Stagehand operates a permitted webpage while Browserbase provides the browser it runs in; OR-Tools takes jobs/constraints and computes a feasible assignment/schedule; Langfuse records the calls/results/timings so a developer can diagnose a failure. GLiNER returns extracted fields, while GLiDE chooses among defined outcomes. These are different jobs, not a requirement to combine every tool.

## How it works (approach, flow in words, libraries/services used and why)
### Requirements that change the ranking
Sources read 2026-10-24: `transcript.txt` in full; `BAHN/context/car-delivery-control-room/PARTICIPANT-BRIEF.md`, `OPERATIONS-CONTEXT.md`, dataset README/schema and starter README/package manifest; Bahn 13-page deck; Velho 4-page brief and 4-page slides. Requirements are owned by F-003/F-004, not this shortlist.

Bahn-only implications: the starter already has 100 fictional orders, conversations, proposals, PDFs/photos, route records and travel quotes/reservations. Another CRM, production booking connector or fleet optimiser is not a default missing capability. The real LLM must operate in a loop, while calls, prices, maps and replies may be simulated. Approved changes still need current-state checks, correct case scope and duplicate-action protection. A generic approval feature does not automatically implement those rules. Preserve evidence: a quote is not a booking, acknowledgement is not resolution and a driver message is not live GPS. Prototype clock is the supplied snapshot, not today's wall clock.

Velho-only implications: produce a useful result live on a company the judges pick. Fixed pre-generated examples alone are inadequate. The speaker explicitly welcomes signals, assessments, media and buyer simulators; these are directions, not a selected product. Actual outbound contact or publication still needs Velho permission. A public signal is a reason to investigate, not proof of an internal automation problem.

### Bahn - recommended core capabilities
**One agent runtime: n8n OR AI SDK; LangGraph as an alternative.** Existing local n8n can run a looping agent with read-only tools and pause before reviewed actions. Keep its workflow editor out of the operator-facing UI. If adopting the supplied Next.js/TypeScript starter, AI SDK is a close fit for tools and streamed responses inside that app. Its WorkflowAgent supports persisted steps and approvals, while a simpler agent plus database proposal records may be enough. LangGraph offers checkpointed state and interrupts if explicit branching/resumption dominates. Do not install three orchestration frameworks for one agent. Developer libraries are implementation options, not selected dependencies.
- n8n: https://docs.n8n.io/build/integrate-ai/ai-examples/human-in-the-loop-for-tools
- AI SDK: https://ai-sdk.dev/docs/agents/workflow-agent
- LangGraph: https://docs.langchain.com/oss/javascript/langgraph/interrupts
- Version caveat: current AI SDK docs distinguish WorkflowAgent `needsApproval` from other APIs' `toolApproval`; pin a compatible version and follow its actual contract. Use bounded loop limits. Persistence does not replace database concurrency controls.
- Example tool loop: read order -> inspect conversation and reservation evidence -> ask simulated driver a missing question -> collect reply -> produce a sourced proposal -> wait for operator -> recheck state -> commit a fictional change.

**OpenRouter plus optional Fastino.** OpenRouter supplies a generative, tool-capable model for the actual loop. Use a model/endpoint that supports required tools, structured output and images if examining photos. GLiDE v1.2 is a bounded decision tool within that loop, not the complete conversational agent. GLiNER is useful for repeated field extraction from messages; not compulsory if the selected main model extracts accurately. Start from existing provider access rather than adding another generic model account.
- https://openrouter.ai/docs/guides/features/structured-outputs (support varies by endpoint)
- Exact Fastino contracts remain in F-006. Schema-conforming output does not prove factual correctness or approved authority.

**Promptfoo (new, high priority) plus Langfuse if useful.** Promptfoo runs cases with expected outputs and assertions so changes can be compared. Bahn examples: do not treat a ferry quote as a reservation; do not send a customer message before approval; do not mark a case safe without evidence; do not apply an old approval after the order changes. Some checks must inspect actual app/database effects, not merely model text. A small custom test runner is a valid simpler alternative.
- https://www.promptfoo.dev/docs/configuration/expected-outputs/
- Langfuse records runtime model/tool inputs, outputs and timings for diagnosis. It is complementary, not a substitute for tests or the separate coding-agent work record.
- https://langfuse.com/docs
- Bahn's 30% AI-work criterion concerns how we built the entry. Runtime traces alone do not satisfy it; preserve actual prompts, human corrections, rejected outputs and checks in F-004 and sanitised exports.

### Bahn - choose by agent area
| Area | Useful tools | Input -> output | Priority and boundary |
|---|---|---|---|
| Pickup readiness / phone | Vapi web voice (new) or equivalent voice provider | Simulated seller speaks -> agent hears, asks questions, calls allowed tools and returns readiness evidence | High if selecting phone work; use a participant/browser role-playing the fictional seller, not real phone numbers. |
| Driver support | Main tool-capable LLM, case tools, GLiNER/GLiDE optionally | Driver question -> relevant sourced answer or a prepared operator decision | No web scraping or production messaging connector required for the fictional packet. |
| On-road exception | Vision-capable model, evidence tools, approval records | Supplied photo/message -> facts to check, simulated follow-up, proposed next action | Image interpretation is not a definitive mechanical diagnosis. Never imply a make/model illustration depicts this exact car. |
| Document/release evidence | Docling or a vision model | Fictional PDF/photo -> extracted fields with source/page links | Add if actual documents are central; basic PDF extraction may suffice. GLiNER needs text first. |
| Travel replanning | Stagehand/Browserbase, openrouteservice optionally | Simulated booking portal -> compared itinerary or pending approval | Prefer supplied fictional schedules/prices and simulated bookings. Roads do not supply ferry/flight timetables; city names can be real but operational addresses are fictional. |
| Assignment optimisation | OR-Tools | Structured jobs/availability/constraints -> candidate schedule | Lower priority unless choosing this specific area; truck routing examples are not Bahn's driver-per-car business. |

Vapi browser voice: https://docs.vapi.ai/quickstart/web ; simulation guidance: https://docs.vapi.ai/test/simulations-best-practices . Vapi simulations may invoke real tools; use mock/sandbox effects. Paid voice service is optional; a text simulator can satisfy Bahn's stated rules.

### Velho - refined acquisition-tool choices
**Search and evidence: existing Exa/Agent Reach plus Firecrawl.** Given the judges' chosen company, discover current official/news/career pages and collect their content. Return a short source-backed company brief with dates and unknowns. Firecrawl gathers pages; it does not decide the acquisition strategy. This underlies signals, proof-before-pitch and buyer simulations.

**Exa Agent (new) / Websets (conditional alternative).** Agent can research a company or build a source-backed list with structured output. Websets searches for items matching explicit criteria, verifies/enriches them and supports recurring monitors. Current Websets docs recommend Exa Agent for new list-building/enrichment integrations; Websets is still documented, not permanently closed, and its API has separate paid-plan/credit requirements. Existing Agent Reach search access is not automatically an application's Exa entitlement.
- https://exa.ai/docs/agent/quickstart
- https://exa.ai/docs/websets/quickstart
- Concrete input: established Finnish companies with dated expansion evidence; output: candidates with the actual source and reason to investigate. For a live judges' company, use direct research rather than waiting for a giant list job.

**changedetection.io (new).** Watches selected pages and returns differences over time. For a known target company, a changed careers page or expansion announcement can create a dated follow-up task. This detects changes; GLiDE/main model judges whether the change is relevant. Demo a labelled before/after fixture or a freshly observed change; do not pretend a historical observation was collected this weekend.
- https://changedetection.io/docs/api_v1/index.html

**PRH/YTJ and TED Search API (new data sources).** PRH provides Finnish business identity/basic register data; use it to resolve the company and avoid confusing similarly named firms. It is not a public email/phone directory. TED provides searchable published European procurement notices: extract stated requirements and dates as concrete research signals. A tender can inform a prospect brief or opportunity, not automatically establish that Velho qualifies or that procurement rules permit a direct sale. Finnish national tenders and private-company opportunities are not all covered by TED.
- https://www.prh.fi/en/companiesandorganisations/tietopalvelut/prhopendata.html
- https://docs.ted.europa.eu/api/latest/index.html (Search API needs no API key)

**Media/pitch branch: HeyGen (new), Docling, browser voice.** HeyGen turns an approved script/assets into video; template API makes per-company variants and translation supports localisation. Fits Velho's one-of-one media or campaign-engine directions. Use stock/licensed presenters rather than impersonating a buyer. A video containing a logo is not useful personalisation unless its argument is sourced and specific. Docling can read the chosen company's actual public annual report for a buyer simulator; a voice agent can role-play a fictional CFO with sourced facts and labelled simulated objections.
- https://developers.heygen.com/
- https://www.heygen.com/blog/heygen-api-guide

**Composio / n8n - later handoff, not the differentiator.** Useful if the selected approach needs a permissioned demo calendar, CRM or inbox. Avoid plumbing every integration before proving why a real buyer would care. Preview drafts; obtain Velho permission before any actual contact/publication. A demo booking or draft is not a real customer meeting.

### Smallest sensible starting sets (recommendations, not decisions)
- Bahn: selected UI/database, n8n as the agent runtime (selected 2026-10-24, see F-010), one tool-capable generative model, explicit evidence/proposal records and a few regression cases. Add Vapi for phone, vision/Docling for document/photo work, or browser automation for travel only if choosing that area. GLiDE can classify/escalate after the main facts are assembled.
- Velho: existing search plus optional Firecrawl, one generative model, and a distinctive artifact on a supplied company. Add changedetection/TED for signal timing, HeyGen for media, or report extraction/voice for buyer rehearsal. Evaluate whether a CEO would read/reply, not how many tools run.
- Matrix remains an optional shared host in F-009. Its compute is not another agent framework or automatic access to every provider. No runtime/service readiness audit was requested for this shortlist.

### Retained optional-tool reference
The following earlier catalog records explain capabilities and dated 23 October pricing; priorities above reflect the released briefs. Lower priority does not mean temporarily unavailable or permanently closed.

### Firecrawl - collect website content
Fit: Velho company/service/case-study research, either track if a website is an input. Adds systematic crawling and an app API beyond existing Exa/Jina; unnecessary for a few pages already readable. SDK/API/MCP available. Low setup estimate for one public-page request.
Published free tier: 1,000 credits/month, no card; basic scrape one credit/page, advanced extraction costs more, low rate limits. Account eligibility/credits not verified.
Proof target: three known public pages, retaining URLs and reporting missing content. Do not infer private processes from marketing pages.
Sources: https://docs.firecrawl.dev/mcp-server ; https://www.firecrawl.dev/pricing

### openrouteservice - road travel-time/distance matrices
Fit: Bahn if travel estimates matter. Compute road journeys from input coordinates; not live driver availability, traffic or ferry schedules. Low-to-medium setup estimate with a registered key.
Free Standard access advertised; current account quotas not verified. Numeric older plans surfaced on a staging domain, so check the dashboard rather than promising those limits. Official migration announcement says use `api.heigit.org`; old `api.openrouteservice.org` has reduced quotas and imminent shutdown. Follow current endpoint docs.
Proof target: a small matrix with plausible journeys, coordinate order `[longitude, latitude]`, explicit units and request limits.
Sources: https://openrouteservice.org/services/ ; https://openrouteservice.org/dev/ ; https://ask.openrouteservice.org/t/reducing-the-quota-of-deprecated-api-api-openrouteservice-org/8013

### GLiNER - extract stated facts before deciding
Fit: either track; optional complement from the same Fastino provider as GLiDE. See F-006 for contracts and untested entitlement. Do not confuse extraction with decision-making.

### Docling - PDF/office document conversion and OCR
Fit: Bahn paperwork or Velho case documents if they are actual inputs. Local package with model downloads/OCR dependencies; no hosted API key. Medium setup estimate. Digital text PDFs may only need a basic parser.
Proof target: one representative document, including a scan if needed; check identifiers, dates and tables against the source. Pre-download selected models before demo day; no installation performed.
Sources: https://docling-project.github.io/docling/usage/supported_formats/ ; https://docling-project.github.io/docling/_generated/examples/full_page_ocr/ ; https://docling-project.github.io/docling/faq/

### Composio - connect accounts and app actions
Fit: either track if the app needs inbox/calendar/CRM access. Handles integration auth; an alternative to n8n/direct APIs for the same job. Connect MCP is for the coding agent; use SDK sessions/per-user connections for a submitted application. Medium setup estimate including OAuth.
Published Hobby includes 100,000 tool calls/month and 3 team members, no card; shared managed OAuth apps have a lower included allowance (20,000 tool calls). Some provider tools/add-ons cost separately. No connections created or account limits verified.
Proof target: authorise only the required demo account; read a synthetic record or create a reviewable draft if requested. A connection does not authorise outreach.
Sources: https://docs.composio.dev/docs/composio-connect ; https://next.docs.composio.dev/docs/quickstart ; https://composio.dev/pricing

### Browserbase / Stagehand - browser automation inside the entry
Fit: either track only when a permitted portal has no suitable API. Current CUA is our research/development access; REA is passive and event-origin-restricted. Neither is automatically an app backend.
Stagehand is open source and runs locally; Browserbase hosts browsers. Medium setup estimate; prefer existing APIs. Current Browserbase pricing lists free 1 browser hour, 15-minute sessions and 3 concurrent browsers; an older blog says one concurrent browser. Prefer pricing/account limits. LLM calls can cost separately.
Proof target: one permitted public/sandbox task in a separate profile. No SDK/account/permissions added.
Sources: https://www.browserbase.com/stagehand ; https://www.browserbase.com/pricing

### Google OR-Tools - constrained assignment/scheduling
Fit: Bahn only if the brief calls for it. Free local solver; requires travel matrix and actual business constraints. Does not supply road data. Medium-to-high modeling effort; simple rules may suffice for a small case.
Bahn says one driver per car: do not blindly model a truck carrying multiple packages. Driver repositioning, shifts and time windows must match the partner's process.
Proof target: small known feasible and infeasible cases checked against constraints. No install or solver test performed.
Sources: https://developers.google.com/optimization/routing ; https://developers.google.com/optimization/routing/pickup_delivery

### Langfuse - traces and evaluations
Fit: either track after a workflow exists. Log models/tools, latency, costs and failures; it does not run agents. Low-to-medium SDK setup estimate; structured local logs may suffice initially.
Published Cloud Hobby: 50,000 units/month, 2 users, 30-day data access, no card. Units combine traces/observations/scores, not full agent runs. Data access window does not mean deletion after 30 days.
Proof target: one successful and one failed trace without secrets/unnecessary customer data. No signup or instrumentation performed.
Sources: https://langfuse.com/pricing ; https://langfuse.com/resources/engineering/clarifications ; https://langfuse.com/faq/all/data-access-vs-data-retention

## Files and locations (REQUIRED)
- `ai-docs/features/F-007-hackathon-tool-shortlist.md`: dated recommendations, sources, limits and proof targets.
- `AGENTS.md`: project-level proactive tool recommendation rule, imported by CLAUDE.md and GEMINI.md.
- `ai-docs/INDEX.md`: every-turn discovery pointer to this catalog and scenario lookup.

## Setup and config (everything needed to recreate it)
No new candidates installed or registered. Existing direct n8n search returned results this turn; existing Agent Reach Exa returned Fastino docs with read-only network escalation after normal-shell DNS failure. REA's earlier verification was read from F-005, not repeated. No API secrets read.

Preparation order: select each track's workflow, choose its smallest starting set above, then add area-specific tools. A local n8n instance and authenticated temporary MCP access were verified in F-005; these checks were not rerun. Neither track has selected n8n as its product stack. No new service installed or tested in this research turn.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Public docs, dated pricing and conditional use-case inferences from 2026-10-23/24. Recommendations assume services work per the user; this is not a claim about current account authentication. No business records uploaded. Bahn uses fictional packet data and simulated effects. Velho can research public information but contact/publication needs partner permission. Preserve source URLs and retrieval times.

## Read first / Depends on (REQUIRED)
[[F-005-n8n-mcp-local]] - shared tooling and remaining startup/authentication gaps.
[[F-006-fastino-readiness]] - Fastino contracts; GLiDE access verified for Bahn, GLiNER untested.
[[F-003-velho-entry]] - Velho-only acquisition goal and discovery boundaries.
[[F-004-bahn-entry]] - Bahn-only released control-room brief and constraints.
[[F-008-challenge-source-files]] - local sources and mixed-transcript attribution.
[[F-009-matrix-os-shared]] - optional shared hosting, not a required stack.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
Research does not authorise installs, subscriptions, account connections or messaging. No solution chosen. Free tier is not proof of provisioned access. Select only tools that remove a real bottleneck against the released briefs and chosen workflow; retain a replayable fixture for service outages.

## How to verify (steps to confirm it works)
Documentation: confirm AGENTS.md and INDEX route future agents here, and every retained/new tool has track-fit and scenario guidance. This validates handoff instructions, not live service readiness.

For selected tools read current quickstart/account limits, run the proof target with synthetic inputs and record actual output plus a fallback. Verify Windows dependencies and endpoint migrations before relying on a demo.

## Open TODOs (unfinished work and next steps for this feature)
Select tools for the chosen Bahn or Velho workflow; obtain setup authorisation; smoke-test only the minimum required capabilities and save observed readiness.
