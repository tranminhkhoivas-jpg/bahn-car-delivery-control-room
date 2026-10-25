# How we worked with AI

A plain-language account for judges. The detailed engineering log (with workflow names and ids) is the master doc in [`ai-docs/`](../ai-docs/INDEX.md); this page is the readable version.

## The setup in one paragraph

On this page "we" means the team (one person); "the AI" means the coding agents. We made every product decision; the AI did the building: Claude Opus 5.5 in Claude Code built the agent workflows and the control room; GPT 6.1 in Codex did the early reading of Bahn's brief and the tool research; the Antigravity (AGY) CLI prepared the GitHub repository. A shared "master doc" in `ai-docs/` acted as the team's memory, so any AI chat could pick up where another left off. Every AI change had to update it the same turn, and a check blocked the AI from finishing until it did.

## Tools we used and why

| Tool | What it does here | Why this one |
|---|---|---|
| **n8n** (self-hosted, local) | Runs the agent: a router plus one workflow per problem type (journey, vehicle, incident, documents, expenses...), and the tools they call. | Each step is visible and inspectable on a canvas, so a person can see what the agent did. The AI built the workflows through the **n8n-MCP** connector and a setup script that installs everything on an empty n8n. |
| **n8n Data Tables** | Stores cases, plans, plan steps, messages and settings. | Built into n8n; no Docker or database server needed, so a fresh clone runs on a laptop. |
| **Claude Haiku 5.5 via OpenRouter** | The agents' reasoning and wording; also plays the simulated driver and buyer in the demo. | Fast and cheap enough for many small agent turns; OpenRouter was the event's credit provider. |
| **GLiDE v1.2 (Fastino)** | A small, very fast yes/no judge used at every gate: which problem type an event is, whether a buyer's or employee's answer is clear, whether a simulated reply contradicts the data, whether a closed case should reopen, whether a case can close. | Our own idea, not the AI's. A big model is slow and costly for "is this answer clear?". GLiDE answers in a fraction of a second with a confidence score, and each threshold is a setting Bahn can change. In a test it scored invented driver replies 0.97+ as contradictions and an honest reply 0.01. |
| **Langfuse** | Holds the agents' instructions as versioned prompts. A new version is saved as "candidate"; only a person promotes it to "production". | Changing what the agent is told is a change to the product, so it gets the same "a person says yes" rule as bookings. |
| **Promptfoo** | Replays past cases against a candidate prompt and the current one and reports which passes more. | A way to test a new version on past cases instead of trusting a reworded instruction. Honest status: the suite passes (25/25 once, routing 8/8 on the live code) but has not caught a bug yet, and AI-graded cases can score differently between runs, so one run is not enough to decide. |
| **Telegram** (bots) | How the agent talks to drivers, buyers and staff in the demo. A second "simulated people" bot posts the simulated replies so viewers see the whole conversation. | Free, instant, works on any phone, with buttons for "which order?" and buyer choices. |
| **Next.js control room** (Bahn's starter, PGlite) | The staff screen: the queue of cases that need a person, plans with costs, approve/reject, steps, settings. | Bahn's own starter kept their look and data model; PGlite (Postgres in-process) removed the need for Docker. |

## Rules we gave the AI (and why)

| Rule | Why |
|---|---|
| Ask us questions before building; we pick. | Choices like storage, model, scoring order are product decisions, not code decisions. |
| Announce any deviation from the agreed plan *before* building it. | Early on, the AI reported deviations afterwards; we found that too late to steer. |
| End every update with a short plain-language summary. | The AI's updates were long and full of internal names; we lost track of the product. |
| Test live, not just on paper; report failures honestly. | Several bugs only showed up in live runs (below). |
| Never write a secret value anywhere. | The repo is public. |

## The big decisions: what AI proposed, what we decided

| Question | AI's suggestion | Our decision and reason |
|---|---|---|
| Which area? | Several were possible. | **On the road** (breakdowns, missed ships, delays): the most varied, most human-judgement-heavy area. |
| Who computes prices and times? | Early drafts let the language model write them. | **Code computes every number; the AI only explains.** A model once wrote a wrong check-in date and once invented a EUR 450 tow cost with no data behind it. |
| What is the "best" ferry? | Cheapest or fastest. | **On time first, then price, then convenience** (our own wording, not the AI's). |
| Things with no reliable price (tow, repair)? | AI priced them itself. | **They become a task for a Bahn employee, never a made-up number.** |
| Several problems on one order? | Each problem agent files its own plan. | **One coordinator merges everything into ONE plan per order**, so a person never has to compare two half-plans. |
| Driver hurt or in danger? | AI judges seriousness. | **The AI does not judge.** The driver gets "call 112" at once, a top-priority employee task opens, and no rebooking happens until a person decides. |
| Optimising across many deliveries (sharing one ferry)? | AI proposed it as a differentiator. | **Dropped.** We asked Bahn on Discord; they said it is rare and out of scope. |
| Language to buyers? | English only. | We asked Bahn: the customer's language, usually English. **Staff approve English; the buyer receives it translated, with the English below.** |
| Hard-coded thresholds? | Fixed numbers in code. | **Every number is a setting Bahn can change in the control room** (reply wait times, safety margins, AI confidence levels). Our values are placeholders. |
| Changing the agent's instructions? | Edit and deploy. | **A new instruction version can be tested on past cases (Promptfoo) and only goes live after a person promotes it** (Langfuse). |

## Where the AI was wrong, and how we caught it

All found in live test runs, then fixed and re-tested:

- **Money:** a Danish-krone receipt (DKK 315) was shown as EUR 315. Now converted with a rate list staff edit on the Settings page; a currency not on the list goes to a person instead of being guessed.
- **Too early:** the agent booked a tow before the buyer chose how to recover the car. Now the buyer is asked first.
- **Asking twice:** a follow-up asked the buyer again after they had already agreed. Fixed with a shared rule.
- **Wrong "on time":** a journey check ignored the driver app's own arrival estimate and called a late car on time. Now it uses the later of the two.
- **Waiting for nobody:** a plan waited for a buyer answer although no buyer had been asked. Now refused by code.
- **Safety order:** the 112 safety message could arrive after the agent's own question. Now it is always sent first.
- **Checks after bookings:** a staff check meant to guard a booking ran after it. Now such checks run first, and the plan cannot be approved until they are done.
- **Known and accepted:** the agent may ask "are you safe?" once more right after the driver answered the 112 message (a timing race). We judged it harmless for the demo.

## What a person always controls

Bahn's rule: the agent never contacts a customer on its own. In our build a person must approve every booking, date change, cost and buyer message. The agent may freely ask the driver questions and look things up. Every booking re-checks the current state right before it runs.

## Where to look deeper

- What the product does and how to run it: [`BAHN/README.md`](README.md).
- Every decision with its reason and rejected alternatives: [`ai-docs/features/F-010-bahn-on-the-road-n8n.md`](../ai-docs/features/F-010-bahn-on-the-road-n8n.md) ("Decisions and gotchas").
- Iteration-by-iteration AI work log: [`ai-docs/features/F-004-bahn-entry.md`](../ai-docs/features/F-004-bahn-entry.md) ("How we worked with AI").
- Full change history: [`ai-docs/CHANGELOG.md`](../ai-docs/CHANGELOG.md).
