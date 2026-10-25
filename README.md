# Bahn Express: Car Delivery Control Room

The Bahn Express "Car Delivery Control Room" pairs an On-the-road operations agent built in n8n with a Next.js control room to manage vehicle deliveries already on the move. When disruptions occur—such as sold-out ferries, damaged vehicles, unwell drivers, or unresponsive contacts—an n8n router coordinates specialized problem agents that inspect facts using code tools and assemble unified, single-plan options per order. Operating strictly on synthetic data with mock bookings, the system enforces a strict human-in-the-loop guarantee where a person must approve every booking, cost, delivery date change, and customer message before execution, while enabling drivers, buyers, and operations staff to coordinate interactively.

## What we built and why

- **One deep agent, not many shallow ones.** We chose the On-the-road area (breakdowns, missed ships, illness, delays) and built it end to end.
- **Facts first, one decision for a person.** The agent asks the driver, checks the journey, searches ferries, trains, flights and hotels, then shows staff ONE plan per order with costs, times and its reasons.
- **It plans for the knock-on effects.** One missed ferry moves hotel nights, the driver's rest and the buyer's delivery window, so the plan recomputes the whole chain. To keep things from getting worse: options that would leave before a person can approve are dropped; ferry bookings keep a spare margin; every booking re-checks right before it runs; a failed booking triggers a re-plan; a new problem replaces the open plan and warns a buyer holding an offer; every offer has a reply-by time.
- **Code does the maths, AI does the talking.** Every price, time and "on time or late" is computed by code; the AI only gathers facts and explains.
- **A person approves every booking, cost, date change and buyer message.** Rejecting a plan needs a reason, and the agent re-plans around it.
- **Safety first.** A driver in danger gets "call 112" at once and a top-priority task opens for staff; the AI never judges how serious it is.
- **Built with:** n8n (agent workflows), Claude Haiku 5.5 via OpenRouter, GLiDE v1.2 by Fastino (fast yes/no gates), Langfuse (prompt versions a person promotes), Promptfoo (prompt regression tests), Telegram (driver/buyer/staff chat), Next.js (control room). Why each: [BAHN/HOW-WE-WORKED-WITH-AI.md](BAHN/HOW-WE-WORKED-WITH-AI.md#tools-we-used-and-why).
- **Same staff, same order when possible.** With a name typed in, the queue lists that person's own orders first (urgent ones still on top), then new ones, then orders colleagues worked; each order is tagged "Worked with before" or "Last handled by <name>". A soft preference, never a lock.
- **Bahn can tune it.** Every wait time, margin and AI confidence level is a setting in the control room.

How the team used AI to build this, including where the AI was wrong and what we decided instead: [BAHN/HOW-WE-WORKED-WITH-AI.md](BAHN/HOW-WE-WORKED-WITH-AI.md). The full engineering log is the master doc in [ai-docs/](ai-docs/INDEX.md).

## Run it

For setup, requirements, and instructions on running the agent and control room, see [BAHN/README.md](BAHN/README.md).
