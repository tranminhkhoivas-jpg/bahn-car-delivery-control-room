# How we worked with AI

A plain-language account for judges. The detailed engineering log (with workflow names and ids) is the master doc in [`ai-docs/`](../ai-docs/INDEX.md); this page is the readable version.

## The setup in one paragraph

One person (the team) made every product decision. Coding agents did the building: Claude Opus 5.5 in Claude Code built the agent workflows and the control room; GPT 6.1 in Codex did the early reading of Bahn's brief and the tool research; the Antigravity (AGY) CLI prepared the GitHub repository. A shared "master doc" in `ai-docs/` acted as the team's memory, so any AI chat could pick up where another left off. Every AI change had to update it the same turn, and a check blocked the AI from finishing until it did.

## Rules we gave the AI (and why)

| Rule | Why |
|---|---|
| Ask questions before building; the person picks. | Choices like storage, model, scoring order are product decisions, not code decisions. |
| Announce any deviation from the agreed plan *before* building it. | Early on, the AI reported deviations afterwards; we found that too late to steer. |
| End every update with a short plain-language summary. | The AI's updates were long and full of internal names; the person lost track of the product. |
| Test live, not just on paper; report failures honestly. | Several bugs only showed up in live runs (below). |
| Never write a secret value anywhere. | The repo is public. |

## The big decisions: what AI proposed, what we decided

| Question | AI's suggestion | Our decision and reason |
|---|---|---|
| Which area? | Several were possible. | **On the road** (breakdowns, missed ships, delays): the most varied, most human-judgement-heavy area. |
| Who computes prices and times? | Early drafts let the language model write them. | **Code computes every number; the AI only explains.** A model once wrote a wrong check-in date and once invented a EUR 450 tow cost with no data behind it. |
| What is the "best" ferry? | Cheapest or fastest. | **On time first, then price, then convenience** (the person's own wording). |
| Things with no reliable price (tow, repair)? | AI priced them itself. | **They become a task for a Bahn employee, never a made-up number.** |
| Several problems on one order? | Each problem agent files its own plan. | **One coordinator merges everything into ONE plan per order**, so a person never has to compare two half-plans. |
| Driver hurt or in danger? | AI judges seriousness. | **The AI does not judge.** The driver gets "call 112" at once, a top-priority employee task opens, and no rebooking happens until a person decides. |
| Optimising across many deliveries (sharing one ferry)? | AI proposed it as a differentiator. | **Dropped.** We asked Bahn on Discord; they said it is rare and out of scope. |
| Language to buyers? | English only. | We asked Bahn: the customer's language, usually English. **Staff approve English; the buyer receives it translated, with the English below.** |
| Hard-coded thresholds? | Fixed numbers in code. | **Every number is a setting Bahn can change in the control room** (reply wait times, safety margins, AI confidence levels). Our values are placeholders. |
| Changing the agent's instructions? | Edit and deploy. | **A new instruction version is tested (Promptfoo) and only goes live after a person promotes it** (Langfuse). |

## Where the AI was wrong, and how we caught it

All found in live test runs, then fixed and re-tested:

- **Money:** a Danish-krone receipt (DKK 315) was shown as EUR 315. Now converted, and unknown currencies are refused.
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
