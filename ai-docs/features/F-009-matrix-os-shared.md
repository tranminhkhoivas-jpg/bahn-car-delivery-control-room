# F-009 - Matrix OS shared cloud workspace

- **Scope:** Shared
- **Status:** partial
- **Built by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last edited by:** gpt-6.1-sol via Codex, 2026-10-24
- **Last verified working:** 2026-10-24; official Matrix docs read via Agent Reach/Exa and web tools, and local challenge/transcript checked. No Matrix account, VM, migration, model login or app run verified.

## Track scope
Matrix OS is an optional cloud computer available as a tool for either Bahn or Velho, alongside the shared tools in F-005 to F-007. Its separate tool challenge can accompany either partner entry. Using it does not merge the entries, change their rubrics or make Bahn's AI-work criterion apply to Velho.

## Purpose (why this exists, tied to project goal)
Provide a persistent remote workspace for code, dev servers and agents when useful. Distinguish published capability from the hackathon account's actual resources and credits.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
The opening Matrix presentation describes a Linux cloud computer with terminal, apps, connected tools and agents. Official docs support cloning projects, running coding agents remotely and reconnecting to persistent sessions. Availability still depends on the computer running and valid account/model access.

### Local development and later migration
Yes: the official quickstart explicitly supports cloning an existing repository onto Matrix. A project can be built locally first; it does not have to originate in Matrix.

Recommended transfer procedure (not executed): commit the intended source and lockfiles, transfer through an authorised Git remote, clone into `~/projects` on Matrix, install dependencies there, configure secrets separately, restore or seed required data, then run the documented checks and demo. Do not upload Windows `node_modules`, local build outputs or private machine credentials. Local agent history does not automatically follow the code; carry the relevant master docs and a concise task handoff.

For Bahn's optional starter, confirm Node.js 24+, Docker/Compose, Postgres and attachment-store support on the assigned Matrix VM before depending on a quick move. These project requirements are in F-004. A source clone alone does not transfer database or object-store state. Use synthetic reseeding where appropriate. Velho's eventual requirements depend on its selected stack.

The Matrix CLI also documents file sync, and its coding-agents guide links a separate handoff skill. Neither is installed or tested here. Transfer time is unmeasured: dependency installs, data size and compatibility determine whether it is quick. An early remote smoke test is recommended before the final demo.

### AI access and credits
The cloud computer and coding-agent model access are separate. Matrix's coding-agents guide requires each agent's own provider login or API access. A Matrix subscription does not itself supply Claude Code or Codex usage.

Matrix also offers managed Matrix AI model access using its own credit balance. Eligibility and available models vary; its documented one-time USD 5 starter Chat-credit update is not rolled out to everyone. This is not proof of free coding-agent access on this user's account.

Shared event offer: the organiser announces USD 20 OpenRouter credit per participant in `transcript.txt`; provider access status belongs to F-005. The local Matrix challenge describes 3 months of Matrix plus USD 300 AI credit per winning team member as a prize, not a universal participant grant. Hackathon-provided VM tier, free-access period and any extra model credit remain unconfirmed.

### Published hosted VM specifications
Official Settings & Billing table read on 2026-10-24. Standard list plans, not verified hackathon allocations. Confirm the actual computer and checkout; older blog pricing differs.

| Plan | USD/month | Germany: vCPU / RAM / disk | US: vCPU / RAM / disk |
|---|---:|---|---|
| Starter | 20 | 2 / 4 GB / 80 GB | 3 / 4 GB / 80 GB |
| Builder | 100 | 8 / 16 GB / 320 GB | 4 / 8 GB / 160 GB |
| Max | 200 | 12 / 24 GB / 480 GB | 8 / 16 GB / 240 GB |

No GPU specification is given in that table. These are published tier specs, not measurements of an assigned machine.

## How it works (approach, flow in words, libraries/services used and why)
The remote computer holds the working files and runs the processes; local desktop/browser/CLI access connects to that workspace. Coding agents authenticate with their providers separately. Reference sources read 2026-10-24:
- https://matrix-os.com/docs/quickstart : GitHub authentication and cloning an existing repository.
- https://matrix-os.com/docs/cli : remote shells, file sync and port forwarding.
- https://matrix-os.com/docs/coding-agents : supported agents, provider credentials and optional task-handoff skill.
- https://matrix-os.com/docs/settings-billing : region-specific compute table and managed Chat-credit rollout.
- https://matrix-os.com/docs/matrix-ai-models : managed credit versus personal provider keys; model readiness varies.
- https://matrix-os.com/ : compute subscriptions and AI billing are separate.

## Files and locations (REQUIRED)
- `ai-docs/features/F-009-matrix-os-shared.md`: shared tool setup/readiness and transfer guidance.
- `MATRIX-OS-CHALLENGE.md`: local copy of the separately judged tool challenge.
- `transcript.txt`: Matrix presentation and organiser OpenRouter announcement; these shared blocks follow the Bahn and Velho talks.
- `~/projects/` on a future Matrix VM: documented repository location, not a local Windows path or an existing verified checkout.

## Setup and config (everything needed to recreate it)
No Matrix setup performed. Obtain the hackathon account/invitation and allocation details. After provisioning, use Matrix Terminal to authenticate Git access through its own flow, clone the chosen repository and set up its documented runtime. Authenticate each coding agent through its supported provider flow. Configure project env vars separately without writing values in docs. Do not assume local global MCP servers or credentials are installed remotely.

## Data (what is stored, schema or fields, retention, privacy/legal implications)
Only public documentation and local event-source descriptions were read. No project files or secrets uploaded. Future transfer scope must be the intended entry, its permitted data and necessary handoff documents. Bahn stays synthetic; Velho permissions remain those in F-003.

## Read first / Depends on (REQUIRED)
[[F-005-n8n-mcp-local]] - shared tools and provider credential readiness.
[[F-008-challenge-source-files]] - local event/tool sources and track boundaries.

## Decisions and gotchas (why choices were made, rejected alternatives, known limits, traps)
Matrix is an available option, not a selected deployment target. Public paid-plan pricing is not evidence that hackathon participants must pay it or receive any particular tier. Migration guidance is an implementation recommendation based on documented repository support, not a completed transfer or guaranteed duration. Keep account credit, cloud-compute access and provider subscriptions distinct.

## How to verify (steps to confirm it works)
Inspect the assigned Matrix computer's plan, region and resource readout. Check actual Chat credit and model readiness separately from coding-agent login. Clone a bounded project, install its required runtimes, run baseline checks and open its app. Reconnect to confirm required processes persist; record observed results and any preview access requirements. No such checks have been performed here.

## Open TODOs (unfinished work and next steps for this feature)
- Confirm the hackathon VM tier/access duration and any participant Matrix AI credit with the Matrix representative or account UI.
- If selected, verify Docker/Compose and the chosen entry's runtime before migration.
- Test one project transfer and app launch; record measured setup time and exact run commands.
