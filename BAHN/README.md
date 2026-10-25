# Bahn Express: On-the-road agent and control room

An AI operations agent for car deliveries that are already on the road (ferry sold out, car damaged, driver ill, buyer not answering).
An n8n router reads each event, picks one or more of 8 problem agents (Claude Haiku 5.5 through OpenRouter, routing checks by Fastino GLiDE), and the agents check facts with code tools and file **one plan per order**.
A person approves every booking, cost, date change and customer message in the control room. Drivers may be messaged without approval. Buyers, drivers and staff talk to it over Telegram.
All data is synthetic (`BAHN/context/car-delivery-control-room/dataset`). Bookings are mock.

## What you need

- Node.js 24+ and npm.
- n8n 2.25+ running locally (see step 2 for the start command; it opens http://127.0.0.1:5678). Create the owner account, then Settings > n8n API > create an API key.
- An OpenRouter API key and a Fastino API key.
- Optional, for Telegram: two bots from BotFather (the Bahn bot and a "simulated people" bot), a demo group with both bots and a staff group with the Bahn bot.
- Optional, for live prompt management: a Langfuse project key pair.

## 1. Keys

Copy `.env.example` to `.env` in the repository root and fill it in (never commit `.env`):

```
N8N_API_URL=http://127.0.0.1:5678
N8N_API_KEY=...
OPENROUTER_API_KEY=...
FASTINO_API_KEY=...
# optional
TELEGRAM_BOT_TOKEN=...
TELEGRAM_SIM_BOT_TOKEN=...
TELEGRAM_DEMO_CHAT_ID=...
TELEGRAM_STAFF_CHAT_ID=...
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=https://cloud.langfuse.com
```

## 2. Agent (n8n)

Start n8n from the repository root with the `.env` loaded. The Telegram workflows read `TELEGRAM_*` from n8n's own environment, which n8n blocks by default, so allow it (this lets workflow code read n8n's environment; keep n8n on 127.0.0.1):

```sh
set -a; . ./.env; set +a
N8N_BLOCK_ENV_ACCESS_IN_NODE=false N8N_LISTEN_ADDRESS=127.0.0.1 npx n8n
```

PowerShell:

```powershell
Get-Content .env | Where-Object { $_ -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$' } | ForEach-Object { Set-Item "env:$($Matches[1])" $Matches[2] }
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE='false'; $env:N8N_LISTEN_ADDRESS='127.0.0.1'; npx n8n
```

Create the API key (see above), put it in `.env` as `N8N_API_KEY`, then in a second terminal:

```sh
node BAHN/build/n8n/setup.mjs --seed
```

This creates the Data Tables, credentials and every workflow on your n8n (safe to re-run; it keeps setting values you edited), then loads the 100 synthetic orders and resets the demo clock.
Check it: `node BAHN/build/n8n/test_workflows.mjs` ends with an `ok:` line.

## 3. Control room

```sh
cd BAHN/build/control-room
npm ci
npm run dev -- -p 3100
```

Open http://localhost:3100/queue (Needs a person). It reads the same root `.env`.

## 4. Try it

1. On Needs a person, type your name, pick a sample event (for example the sold-out ferry) and click **Send to agent**. The page shows the agent working; its report and plan appear in 1-5 minutes.
2. Open the plan: options, cost, drafted buyer and driver messages, and the fact-check result. Choose **Approve and book now** or **Approve and ask the buyer first**, or Reject.
3. With Telegram set up, the buyer offer goes out from the bot. The simulated buyer answers in the demo group, and the agent continues by itself.
4. Settings (`/settings`) holds every threshold and buffer the agent uses. Change one and the next run uses it.

Reset the demo before recording: run `node BAHN/build/n8n/setup.mjs --seed` again (reloads orders, clears cases, restarts the demo clock).

## Where things are

- `BAHN/build/n8n/workflows/`: workflow exports (router `on_the_road_agent.json`, agent template and prompts in `agents/`, code tools, Telegram in/out, reminders). `setup.mjs` deploys them.
- `BAHN/build/control-room/`: Next.js site (fork of the event starter) with the queue, case view and settings. Its own README covers the API.
- `BAHN/build/n8n/promptfoo/`: prompt-fix tests (candidate prompt vs current, side-effect free replay).
- Prompt tests: `node BAHN/build/n8n/promptfoo/suite.mjs` (regression suite) and `node BAHN/build/n8n/promptfoo/run.mjs <fix id>` (test a flagged-mistake fix).
