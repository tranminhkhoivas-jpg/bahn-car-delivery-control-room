# Draft: Prompt Hackathon write-up (Bahn, main write-up)

Not saved to the hub yet. Fields map to `update_project`: title (max 80), tagline (max 140), description (max 5000, plain text, "-" bullets), links (max 6).

## Title
Shoreline: On-the-road Control Room for Bahn

## Tagline
When a delivery goes wrong on the road, the agent gathers the facts and hands one person one clear, priced plan to approve.

## Description
The problem: Bahn's cars are driven by freelance drivers across Europe. When a ferry sells out, a car breaks down or a driver falls ill, an operator today has to piece together the order, the route, the ferries, the driver's messages and the buyer's deadline before anyone can decide anything. That is slow, and the decision often arrives too late.

What we built: one deep agent for the On-the-road area, plus the control room where a person works with it. Team Shoreline is one person; "we" below means that person, "the AI" means the coding agents.

- Needs a person: the queue shows only orders where the agent needs a decision, with urgent ones marked. Quiet orders stay out of the way.
- Cheap work first: the agent asks the driver (are you safe, where are you, a photo), checks the journey against the buyer's deadline, and searches ferries, trains, flights and hotels before it bothers anyone.
- One plan per order: several problems on one order are merged into one plan with every cost, the arrival time against the delivery window, the reasons, and the evidence each fact came from (order records, driver messages, quotes) shown as chips.
- It plans for the knock-on effects, not just the first problem: one missed ferry moves hotel nights, the driver's rest and the buyer's delivery window, so the plan recomputes the whole chain and checks the new arrival against the buyer's window. To keep things from getting worse: options that would leave before a person can approve are dropped; ferry bookings keep a spare margin so a small new delay does not break them; every booking re-checks right before it runs and books nothing if the sailing is no longer on time; a failed booking makes the agent re-plan at once; a new problem on the same order replaces the open plan and tells a buyer holding an offer that an updated one is coming; every offer has a reply-by time, after which the agent re-plans.
- It knows when to stop: anything with no reliable price (tow, repair) or any injury becomes a task for a person, never a guess. A driver in danger gets "call 112" at once and a top-priority task opens.
- Clear next step: every plan says what happens on approval (what gets booked, who gets told). Approve and book, approve and ask the buyer first, or reject with a reason and the agent re-plans around it.
- Safe by design: a person approves every booking, cost, date change and buyer message. Every booking re-checks the current state right before it runs. Drivers can be messaged freely, as Bahn's rules allow.
- Real conversations: drivers, buyers and staff talk to it over Telegram; buyers get messages in their own language with the English underneath.
- Bahn can tune it: every wait time, margin and confidence threshold is a setting in the control room.

How it works (and what's AI about it): an n8n router reads each event and picks the right problem agents (journey, vehicle, incident, documents, expenses, destination, tracking, general). The agents are Claude Haiku 5.5 with code tools. Code computes every price, time and on-time verdict; the AI gathers facts, decides what to ask, and explains. GLiDE v1.2 by Fastino is a fast yes/no judge at each gate: routing, whether a reply is clear, whether a drafted message contradicts the facts, whether a case can close. Agent instructions live in Langfuse and only go live when a person promotes a new version; Promptfoo replays 25 regression cases to test a new version. The control room is Bahn's own starter, extended. All data is Bahn's synthetic packet; bookings are mock.

How we worked with AI: Claude Code built most of it, Codex did the early research. We set rules for the AI: ask before building and let us choose, announce any change to the plan before building it, explain in plain words, test live. Where we did not take the first answer:
- The AI let the model write prices; after it invented a EUR 450 tow cost and a wrong check-in date, we moved every number into code.
- The AI proposed cross-delivery optimisation as a differentiator; we asked Bahn, who called it rare and out of scope, so we dropped it.
- The AI judged how serious a driver's injury was; we decided the agent never judges that, a person does.
- Live tests caught a DKK receipt shown as EUR, a tow booked before the buyer chose, a late car called on time, and a safety message sent after the agent's own question. Each was fixed and re-tested.
The full decision log, with what the AI suggested next to what we decided, is in the repo (BAHN/HOW-WE-WORKED-WITH-AI.md).

What's next: a staff member keeps the orders they already know, inline edits of buyer drafts, the other areas (driver travel already reuses the same re-planning engine), and real booking and map APIs behind the same approval step.

## Links
- Repo: https://github.com/tranminhkhoivas-jpg/bahn-car-delivery-control-room
- How we worked with AI: https://github.com/tranminhkhoivas-jpg/bahn-car-delivery-control-room/blob/main/BAHN/HOW-WE-WORKED-WITH-AI.md
- Video: (add after recording)
