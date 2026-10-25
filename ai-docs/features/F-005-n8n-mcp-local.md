# F-005 - Local n8n-MCP and web research tools

- **Status:** partial
- **Built by:** gpt-6-luna via Codex, 2026-10-23
- **Last edited by:** claude-opus-5-5 via Claude Code, 2026-10-24
- **Last verified:** 2026-10-24; `n8n_health_check` returned status `ok` for `http://127.0.0.1:5678`; installed n8n-MCP is 2.28.8 and its health response reports 2.96.2 available. A short-lived community n8n-MCP stdio process loaded `N8N_API_URL` and `N8N_API_KEY` from the project `.env`, updated the inactive `hackathon BAHN — transport intake template`, and read back its 7-node branched flow. MCP validation returned valid, 0 errors and 5 warnings; the workflow has not been executed. The user entered the OpenRouter key in `.env`; on 2026-10-24 claude-opus-5-5 via Claude Code copied `OPENROUTER_API_KEY` and `FASTINO_API_KEY` into n8n credentials and both providers answered live Bahn workflow runs (F-010). REA's isolated headless Chrome 155 was restarted on approved loopback CDP port 9222; listing and passive inspection of the public challenges page succeeded. Agent Reach Exa search, Jina challenge-page reading and Jina public Telegram-channel reading returned live content. No secret values are stored here.

- **Scope:** Shared
- **Scope reviewed:** 2026-10-24; document audit only. Earlier runtime/provider checks below were not repeated.

## Track scope
Developer tools, provider access and event-hub setup available to either track. The Bahn n8n readback is a tool-access test on an obsolete Bahn draft, not a shared product or proof of either entry working. Velho workflow state belongs to F-003.

## Purpose (why this exists, tied to project goal)
Provide n8n node documentation and workflow validation, internet search/page reading, and optional passive browser analysis if those tools help prepare the Operations entries. This tooling does not select n8n as either entry's application stack.

## Shared setup option - Matrix OS
Matrix OS is also available for this hackathon as an optional persistent cloud workspace for either track. [[F-009-matrix-os-shared]] records repository transfer, coding-agent authentication, managed AI credit distinctions, published VM specs and unverified hackathon allocation. No Matrix VM or project migration is configured or tested here. This tool option sits alongside the local tools; it is not a selected stack for Bahn or Velho.

## Behavior (what the user/visitor/admin sees and can do; edge cases and error states)
The registered Codex connector exposes documentation, node discovery and validation tools. It does not expose the community server's workflow CRUD tools in its tool surface. For live management, a short-lived local stdio MCP client launched the installed community server with the project `.env` variables. Authenticated `n8n_get_workflow` and `n8n_update_full_workflow` calls succeeded, and the saved workflow was read back. `n8n_validate_workflow` returned valid, 0 errors and 5 warnings: the Set-field warning conflicts with readback, the IF warning mislabels its false branch, and three recommend generic Code-node error handling. The one-off process exited after the operation; persistent Codex MCP startup behavior is not confirmed by this test.

The user reports receiving an OpenRouter API key with $20 in event credit. The project-root `.env` holds it as `OPENROUTER_API_KEY` (`.env.example` keeps a blank slot); the value was never displayed. It authenticated live calls on 2026-10-24 through the n8n credential `BAHN OpenRouter`. The key is a credential, not a transferable $20 balance. OpenRouter's Terms say promotional credits are personal and non-transferable; they expire on the date given when issued, or under the general terms if no date is specified. The OpenRouter for Startups program separately says its credits expire six months after issuance; do not assume that startup rule applies to this event grant. Confirm whether the event grant is already credited to the user's own account or uses a sponsor-owned/shared account, and check the issuer's expiration notice. Sources: https://openrouter.ai/terms, https://openrouter.ai/docs/faq, https://openrouter.ai/docs/api_reference/authentication, https://openrouter.ai/startup-program.

Agent Reach routes Exa web search through mcporter and reads pages through Jina Reader. On 2026-10-24, Exa returned the official Operations challenges page; Jina Reader returned that page and the public Prompt Aaltoes Telegram channel. The channel's October 17 post is a general Operations teaser, and its October 22 partner-specific post describes Velho. Read-only calls succeeded with network escalation.

The exact REA administrator scope is saved in the global Codex config. When no browser was listening on port 9222, REA returned `endpoint_unreachable`; a dedicated headless Chrome 155 profile was restarted at `%TEMP%\rea-hackathon-isolated-profile` on the approved loopback endpoint with the public challenges page open and no event login. Direct Codex REA then listed the approved target and passively inspected the page. Keep that Chrome process running when using REA; if it stops, restart the isolated profile.

The global n8n application package is running at `http://127.0.0.1:5678`, bound to loopback. This process was started with `NODES_EXCLUDE=[]`, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `N8N_RESTRICT_FILE_ACCESS_TO=""` and `N8N_LISTEN_ADDRESS=127.0.0.1`. This enables normally excluded nodes, permits node expressions/Code to read process environment variables, and removes the configured file-path allowlist; treat workflows as trusted code with access to the Windows user's permissions. n8n 2.x normally limits file nodes to `~/.n8n-files`; an explicit allowed path is safer. The separate `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` setting remains at its default. These flags are scoped to the current process. The current Codex-launched process can be stopped from its owning session; a PowerShell-launched one can be stopped with Ctrl+C.

The community n8n-MCP can manage the running instance when its process receives the local API URL and key. `n8n_health_check` returned status `ok` and the expected loopback API URL; it reported 2.96.2 available for the installed 2.28.8 package. A temporary process explicitly loaded the API settings from `.env`, confirmed the Bahn workflow in `n8n_list_workflows`, read its full structure, updated it, validated it and read the saved workflow back. Readback confirmed seven nodes, both IF branches and `active: false`. The MCP validator returned valid, zero errors and five warnings: one Set-node warning conflicts with the eight read-back assignments, one labels the IF false branch as an error connection, and three recommend generic Code-node error handling. The workflow was not executed. The one-off process exited after the operation; persistent Codex startup remains unverified.

Bahn-only draft status: the saved intake template predates the released brief and is obsolete for the entry (F-004). Its validation/readback does not verify a control room or a real agent.

Shared tool readiness: the n8n-MCP helper can look up nodes, construct and validate definitions, and manage the local instance when started with its API settings. The local n8n app runs triggers and steps and displays execution results. The saved Bahn template is inactive; it checks visible placeholders and date validity, then branches to an information-request draft or a human review packet. It has no Fastino call or external action. Runtime output remains unverified because the workflow was not executed.

The installed global package is `n8n@2.25.6`; its Windows command is `n8n.cmd` under the global npm directory. The current instance responds at `http://127.0.0.1:5678`. Current official installation guidance says npm installs are deprecated from n8n 3.0 and new installs should use Docker; Docker is not installed here. Sources: https://docs.n8n.io/deploy/host-n8n/install-options/install-with-npm/ and https://docs.n8n.io/deploy/host-n8n/install-options/one-line-setup/.

The user has Fastino and OpenRouter AI-provider keys. The root `.env` contains `FASTINO_API_KEY`, `OPENROUTER_API_KEY`, `N8N_API_URL=http://127.0.0.1:5678` and a populated `N8N_API_KEY`; `OPENROUTER_API_KEY` is populated. `.env.example` contains only variable names and blank slots. The one-off n8n-MCP process loaded the project `.env` explicitly. The old intake template does not call Fastino or OpenRouter; the Bahn On-the-road workflows (F-010) use both through n8n credentials `BAHN OpenRouter` and `BAHN Fastino`, created from `.env` via the n8n API. Persistent MCP startup from this project directory remains unverified.

## How it works (approach, flow in words, libraries/services used and why)
The global npm package n8n-mcp@2.28.8 is at https://github.com/czlonkowski/n8n-mcp. Codex runs its Windows command shim as a stdio MCP server. It is registered globally in Codex, not in this project.

Fastino's official authentication docs specify `FASTINO_API_KEY`; native API requests send it in the `X-API-Key` header, while compatible SDKs accept it as their `api_key`. The project-local `.env` is storage only until the selected workflow runtime is configured to load it. Source: https://docs.fastino.ai/authentication and https://docs.fastino.ai/quickstart.

Agent Reach is at v1.5.0. agent-reach doctor --json reports Jina Reader active and leaves Exa unprobed by design. A live Exa search and Jina fetch succeeded with network escalation. The latest update check failed DNS resolution, so the installed version was not changed.

REA observes a Chrome-family page through the approved loopback Chrome DevTools Protocol endpoint. The global Codex entry sets REA_BROWSER_OBSERVE_ENABLED, REA_BROWSER_CDP_ENDPOINTS_JSON and REA_BROWSER_ALLOWED_ORIGINS_JSON for http://127.0.0.1:9222 and https://prompthack.aaltoes.com. Direct Codex target listing and passive inspection now pass after the desktop restart when a dedicated isolated Chrome profile is running. The current profile is headless, has no event login, and has the public challenges page open. REA's origin filter returns only the approved event origin; observation does not click or navigate.

## Files and locations
- `ai-docs/features/F-005-n8n-mcp-local.md`: setup record and handoff.
- `.env`: shared Fastino, OpenRouter and n8n credential slots plus the local n8n URL; matched by the `.gitignore` rule.
- `.env.example`: secret-free environment variable template.
- `.gitignore`: excludes `.env` and local environment variants.
- `C:/Users/asus/.codex/config.toml`: global Codex registrations for n8n-mcp and the exact approved REA browser-observation scope.
- `C:/Users/asus/.claude.json`: top-level `mcpServers` entries `n8n-mcp`, `rea` and `prompthack` for Claude Code.

## Setup and config
- n8n-MCP package: n8n-mcp@2.28.8 in the user's global npm directory.
- n8n-MCP command: C:/Users/asus/AppData/Roaming/npm/n8n-mcp.cmd. Claude Code runs it as `cmd.exe /c <that path>` with the same five env names listed below; `~/.claude.json` is valid JSON after the edit.
- Claude Code `prompthack` entry (event hub MCP, added 2026-10-24 by claude-haiku-5-5 via Claude Code): HTTP transport, URL `https://prompthack.aaltoes.com/api/mcp`, header `Authorization: Bearer ${PROMPTHACK_KEY}`. The personal hub key is a Windows user environment variable `PROMPTHACK_KEY`, set from the hub's setup copy; the key value is not recorded here. Verified 2026-10-24 after a Claude Code restart: the server connects and read-only tools return hub data, so `${PROMPTHACK_KEY}` expands in headers. Tools present: get_event_info, get_schedule, get_my_team, list_challenges, list_partners, get_my_project, get_submission_status (read) and request_credit, update_project, mark_submitted, unmark_submitted (write; not used).
- Claude Code REA entry: same three REA_* env names and values as the Codex entry (`REA_BROWSER_OBSERVE_ENABLED`, `REA_BROWSER_CDP_ENDPOINTS_JSON`, `REA_BROWSER_ALLOWED_ORIGINS_JSON`). Requires Claude Code restart to load.
- Node.js: 24.11.0; npm: 11.6.1.
- n8n-MCP environment settings: MCP_MODE=stdio, LOG_LEVEL=error, DISABLE_CONSOLE_OUTPUT=true, N8N_MCP_TELEMETRY_DISABLED=true, N8N_MCP_VERSION_CHECK_DISABLED=true.
- Codex MCP settings: startup_timeout_sec=40; default_tools_approval_mode=writes.
- REA settings in the global [mcp_servers.rea.env] table enable passive observation only for http://127.0.0.1:9222 and https://prompthack.aaltoes.com; the exact variable names are listed in How it works. A dedicated isolated Chrome process must listen on port 9222 for the browser tools to work.
- Global n8n package: `n8n@2.25.6`; start command: `n8n.cmd start`; local UI: `http://127.0.0.1:5678`. Current process settings: `NODES_EXCLUDE=[]`, `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`, `N8N_RESTRICT_FILE_ACCESS_TO=""`, `N8N_LISTEN_ADDRESS=127.0.0.1`; these are process-scoped and not saved persistently. `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` remains at its n8n default. Docker is not installed. The project `.env` has `N8N_API_URL` and a populated `N8N_API_KEY`; a short-lived MCP process loaded them and completed authenticated read/update calls. `N8N_MCP_ACCESS_TOKEN` is unset.
- Agent Reach already has an Exa endpoint in the local mcporter configuration. Jina Reader is available without a new account. No credential values belong in this file.
- n8n live control variables: `N8N_API_URL` and `N8N_API_KEY` are Windows user environment variables (HKCU\Environment), copied from the project `.env`. Any process running as this Windows user, including any AI agent with shell access, can read them. The local n8n only listens on 127.0.0.1.
- Fastino key variable: `FASTINO_API_KEY` in the project-root `.env`; the user manages it locally. OpenRouter key variable: `OPENROUTER_API_KEY` in the same file; populated and verified by live calls on 2026-10-24. Both keys are also stored inside n8n credentials (`BAHN OpenRouter`, `BAHN Fastino`, domain allowlists `openrouter.ai` and `api.fastino.ai`). n8n variables: `N8N_API_URL` and `N8N_API_KEY` in the same file; the user has populated the key locally. The one-off MCP process for the live edit loaded the n8n variables from `.env`. Persistent Codex startup behavior is unverified.
- REA passive observation is configured only for the loopback CDP endpoint and exact event origin above. The allowed origin does not permit REA to click or navigate. Use the dedicated browser profile; CDP can access that profile deeply. Desktop restart has been completed and direct Codex REA tools have been verified.

## Data
Agent Reach read public event and Telegram pages. The n8n-MCP process accessed the existing local workflow using the user's API key from `.env`; the key was never displayed. REA observed the public event page through an isolated profile with no event login. The saved template contains a synthetic example and no credentials or live customer data.

## Read first / Depends on
none

## Decisions and gotchas
- This is the community n8n-MCP documentation/workflow-builder server. n8n's native instance-level MCP is separate and runs inside an n8n instance.
- The n8n-MCP process does not install or run n8n. Its API tools would have the privileges of the configured N8N_API_KEY; use a sandbox or least-privilege key and retain approval for writes.
- n8n 2.x disables `ExecuteCommand` and `LocalFileTrigger` by default. `NODES_EXCLUDE=[]` enables normally excluded nodes; do not use with untrusted workflows. `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` is also the documented default and permits workflow expressions/Code nodes to access process environment variables. n8n 2.x defaults file nodes to `~/.n8n-files`; prefer a specific allowed directory over an empty `N8N_RESTRICT_FILE_ACCESS_TO`. Official references: https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/block-specific-nodes/ and https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/use-environment-variables/security/.
- An earlier update check reported v1.6.0 available; the current check failed DNS, so availability was not re-verified and no update was installed.
- Shell DNS restrictions affected direct network calls in the ordinary sandbox. Exa and Jina both worked when their read-only calls were retried with network escalation.
- REA browser observation is not general browser automation. Upstream docs: https://github.com/morluto/rea/blob/main/docs/browser-observation.md. It cannot click or navigate, but CDP can inspect the attached profile; use an isolated profile.
- Unfiltered codex mcp list output can print unrelated existing server environment values. Filter output before sharing it.
- The workspace is not currently a Git repository. `.gitignore` is ready to protect `.env` if Git is initialized; do not assume ignore protection has been exercised by Git yet.

## How to verify
1. Call the direct Codex n8n-MCP tools_documentation and search_nodes tools; both returned results after restart.
2. Check `http://127.0.0.1:5678/healthz`; the loopback-bound instance returned HTTP 200. An unauthenticated API request returned HTTP 401; an MCP process loaded with the local API settings successfully listed and read workflows.
3. `n8n_health_check` returned status `ok`, API URL `http://127.0.0.1:5678`, installed version 2.28.8, and update 2.96.2 available. `n8n_list_workflows` confirmed the target Bahn workflow. Full readback showed seven nodes, eight Set assignments, both IF branches, and `active: false`. `n8n_validate_workflow` returned valid, zero errors and five warnings: the Set-field warning conflicts with readback, the IF warning mislabels output 1, and three recommend generic Code-node error handling. The workflow has not been executed.
4. Run agent-reach doctor --json, then a read-only mcporter Exa query and a Jina Reader fetch. The normal sandbox may require network escalation.
5. Start the isolated Chrome profile on loopback CDP port 9222 with the public event page open. REA target listing and passive page inspection both passed after restart.
6. The project `.env` contains `FASTINO_API_KEY`, `OPENROUTER_API_KEY`, `N8N_API_URL` and `N8N_API_KEY`; verify only variable presence without printing values. OpenRouter and Fastino authentication were verified on 2026-10-24 by F-010 live runs. The temporary MCP process used the n8n settings successfully. The user can execute the inactive intake template from its manual trigger in the local n8n UI; it uses neither AI-provider key.

## Open TODOs
- If persistent Codex live workflow management is needed, configure or confirm the registered n8n-MCP process environment and restart it; the successful authenticated update used a short-lived process that explicitly loaded `.env`.
- Reassess the expanded node/file access after the challenge; keep it only while trusted workflow code needs it.
- `FASTINO_API_KEY` is wired only into the Bahn GLiDE close gate (F-010) at the user's request; never paste it into chat or source control.
- n8n-MCP 2.28.8 `n8n_update_partial_workflow` fails on n8n 2.25.6 ("request/body must NOT have additional properties"); update to 2.96.2 or edit via the n8n REST API.
- Before using the reported OpenRouter event credit, confirm the issuer's account binding and expiration date. Promotional credits are non-transferable; do not treat them as permanent or cash-equivalent.
