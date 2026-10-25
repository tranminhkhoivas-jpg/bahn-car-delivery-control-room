# F-006 - Fastino GLiDE and GLiNER readiness

- **Status:** partial
- **Built by:** gpt-6.1-sol via Codex, 2026-10-23 (research only)
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-25
- **Last verified working:** Velho 2026-10-25: native EN/FI extraction, source/constraint checks and batch use in the 14-method stage pass recorded cases. Original Bahn verification is retained in its own sections; account balance, broader accuracy and provider-billed cost remain unverified.

- **Scope:** Shared
- **Scope reviewed:** 2026-10-24; document audit only. Earlier runtime/provider checks below were not repeated.

## Track scope
Shared Fastino contracts and access. Bahn uses GLiDE as documented separately below. Velho now uses GLiNER extraction and GLiDE claim review in F-014 after explicit user authorization. Track data, rules and runtimes remain separate.

## Purpose (why this exists, tied to project goal)
Assess the user's Fastino access for either entry without selecting a solution or treating key possession as verified integration.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
GLiDE v1.2 is confirmed: Fastino's 22 October 2026 release post explicitly announces it and says inference is available through the Fastino API. The public model card also names v1.2. The hosted API guide uses the stable request model `fastino/GLiDE`; a stable API alias does not invalidate the release version. An authenticated GLiDE request succeeded on 2026-10-24 (Bahn F-010); account balance was not checked. Key storage is documented in F-005.

**Bahn only - in use:** the user chose GLiDE v1.2 to decide whether the On-the-road agent may close a case without a person. Code rules run first and GLiDE cannot override them; threshold noul >= 0.8. A second GLiDE yes/no question checks each simulated driver reply against the order facts (contradiction if noul >= 0.5); invented places, payments and repairs scored >= 0.97 in tests. See [[F-010-bahn-on-the-road-n8n]].

GLiDE evaluates known state against caller-defined decisions. GLiNER separately extracts/classifies text into a schema. Neither discovers hidden customer needs or automatically runs integrations. Generative writing/conversation needs a suitable generative model.

## How it works (approach, flow in words, libraries/services used and why)
Official sources reviewed 2026-10-23:
- https://docs.fastino.ai/concepts/glide
- https://docs.fastino.ai/inference/systemone
- https://docs.fastino.ai/concepts/glide-capabilities
- https://docs.fastino.ai/concepts/models
- https://docs.fastino.ai/pricing
- https://docs.fastino.ai/inference/chat-completions
- https://docs.fastino.ai/concepts/gliner-agent-skill
- https://fastino.ai/blog/training-glide-sota-decision-model (22 October v1.2 release)
- https://huggingface.co/fastino/GLiDE (official v1.2 model card)

GLiDE uses POST `https://api.fastino.ai/v1/systemone`, model `fastino/GLiDE`, shared `state` and named `questions`. Noul answers yes/no; Choice picks one category; Score picks an ordered level. Questions are independent and single-label. It does not use the GLiNER chat-completions contract. Published pricing is USD 0.04/million input tokens and USD 0 output tokens; multiple questions add internal input passes. Confidence is separation between alternatives, not guaranteed accuracy; test fallback thresholds on representative examples. Enforce strict business constraints in code.

GLiNER uses POST `/v1/chat/completions` with model/messages/task schema and JSON encoded in message content. Current catalog includes multilingual GLiNER 2.5 models; published GLiNER price USD 0.03/million input tokens, USD 0 output. Velho tested model `fastino/gliner2.5-multi-v1` on fictional English and Finnish notes. Each returned span is checked against original Unicode character offsets in code; a bare legal suffix such as Oy is discarded. An initial Finnish extraction returned only Oy; more descriptive labels corrected the same case. This is narrow evidence, not a multilingual benchmark.

Concrete distinction: given "Collect AB-123 from Espoo on 24 October; deliver to Turku", GLiNER can return the previously unknown spans AB-123, Espoo, 24 October and Turku as fields. GLiDE's native outputs are yes/no, caller-supplied choices or ordered scores; it can choose Espoo from supplied candidates but does not expose an arbitrary text-span/record output primitive. Both can classify text. GLiNER is optional when another model/parser already extracts the needed fields. The v1.2 release describes text/JSON/image inputs and single-pass decisions without generated thinking tokens; do not describe it as the original thinking-token GLiDE.

Possible Bahn use (suggestion): extract locations, dates and order reference from a message with GLiNER; validate required fields in code; GLiDE classifies continue/request clarification/escalate using the actual order state. This is not permission to assign drivers or send messages.

Velho selected use (F-014): staff paste public or approved sample source text, extract stated people/organizations/dates/metrics/manual tasks/objections with GLiNER and ask GLiDE whether the supplied passage supports a proposed claim. GLiDE support probability at least 0.9 is shown as machine-supported, at most 0.1 unsupported, otherwise review; this never approves outreach or verifies source truth. Velho also batches source checks for case-study sections, campaign research-summary support and original-source research candidates, and uses a separate yes/no constraint check on quiz proposals. The quiz notice names Fastino processing. Headings, questions and proposed approval steps are distinguished from factual outcome assertions; mixed live tests pass. Broader accuracy remains unverified. Public website evidence does not establish an unknown company's internal automation opportunities.

## Files and locations (REQUIRED)
- `ai-docs/features/F-006-fastino-readiness.md`: shared API research and access record.
- `velho/app/lib/fastino.ts`: Velho native API adapter, literal span validation and claim-support thresholds.
- `velho/app/scripts/quality-fastino.ts`, `velho/app/audit/quality-fastino-results.json`, `velho/app/audit/first-quality-fastino-results.json`: fictional EN/FI and supported/contradicted claim evidence. App UI and ledger are owned by [[F-014-velho-improvement-stage]].

## Setup and config (everything needed to recreate it)
`FASTINO_API_KEY` location belongs to F-005. The n8n credential `BAHN Fastino` (httpHeaderAuth, header `X-API-Key`, allowlist `api.fastino.ai`) holds it for the Bahn close gate. No SDK installed. Native Fastino authentication uses `X-API-Key`. Velho loads the existing root `.env` `FASTINO_API_KEY`; requests use `store:false`, explicit small input limits, timeout and no automatic paid fallback/retry. Model aliases: extraction `fastino/gliner2.5-multi-v1`; decisions `fastino/GLiDE` (the stable alias documented for the GLiDE v1.2 release). Response does not independently attest an exact deployed version. Velho Fastino calls are logged separately from OpenRouter in `fastino_calls`, with provider-reported cost nullable and published-rate estimates explicitly separate. One-hundred-call audit cap; normal mode one hundred/day. No purchase, account or SDK installation performed.

Official optional GLiNER Codex skill command is `npx skills add https://docs.fastino.ai --skill fastino-gliner -a codex -y`; not executed. If installation is requested, follow skill-installer and review the skill first. It helps GLiNER development, not proof that GLiDE integration works.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Velho tests send fictional employee notes and public-company source passages to Fastino; no confidential employee/customer records were used. GLiDE docs say `store` defaults true; `store:false` keeps neither request input nor output in inference history. Confirm partner permission and provider handling before sending real records; use synthetic inputs first.

## Read first / Depends on (REQUIRED)
[[F-005-n8n-mcp-local]] - shared tools, credential storage and local n8n access.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
GLiDE and GLiNER inference work for the stated narrow cases; no general latency/accuracy benchmark, account balance or complete entitlement inventory checked. Do not invent a versioned endpoint, assume GLiNER entitlement, use model confidence as proof, or fine-tune before establishing a need. GLiDE does not replace a constraint solver.

## How to verify (steps to confirm it works)
When setup is requested, load the credential securely without printing it, confirm accessible model IDs and run one synthetic request. Then check labelled examples, missing fields, ambiguous cases, timeouts and fallback behavior; record measured output/latency/cost separately from published claims.

## Open TODOs (unfinished work and next steps for this feature)
Bahn: tune its separately owned close-gate threshold on labelled cases before the demo. Velho: expand extraction and support evaluation beyond the initial fictional cases; integrate checks into the remaining source-dependent generators as justified by F-014. No source truth or outreach permission can be established by model probability.
