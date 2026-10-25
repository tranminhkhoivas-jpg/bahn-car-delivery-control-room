// One-step setup of the On-the-road agent on any n8n (fresh or existing): Data Tables, credentials, workflows.
// Usage: node BAHN/build/n8n/setup.mjs [--seed]
// Reads N8N_API_URL, N8N_API_KEY, OPENROUTER_API_KEY, FASTINO_API_KEY (and optional LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY,
// LANGFUSE_HOST) from the environment, then from the repo-root .env.
// Langfuse: each problem agent's full prompt is the Langfuse text prompt "bahn-agent-<key>". The first run creates it (label
// production); a later repo change becomes a new version labelled candidate (a person promotes it in the control room).
// Agents fetch the production version on every run and use the repo text when Langfuse is down or not set up.
// Safe to re-run: existing tables and credentials (matched by name) are kept, existing workflows (by name) are overwritten
// from workflows/*.json. The exports hold this project's original ids; they are swapped for the target instance's ids.
// Code nodes that say "// @include <file>" get workflows/lib/<file> pasted in (travel.js, settings.js). The 8 problem workflows
// ("BAHN agent · ...") are generated from workflows/problem_agent.template.json + workflows/agents/ (prompts, tool lists).
// otr_settings gets every key of lib/settings.js that is missing (placeholder defaults); edited values are never overwritten.
// --seed then runs seed.mjs --reset-cases (loads the 100 synthetic orders, clears case tables, restarts the demo clock).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
for (const k of ['N8N_API_KEY', 'OPENROUTER_API_KEY', 'FASTINO_API_KEY']) if (!process.env[k]) throw new Error(`${k} is not set`);
const API = (process.env.N8N_API_URL || 'http://127.0.0.1:5678') + '/api/v1';
const H = { 'X-N8N-API-KEY': process.env.N8N_API_KEY, 'Content-Type': 'application/json' };

const api = async (method, p, body) => {
  const r = await fetch(API + p, { method, headers: H, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
};
const listAll = async (p) => {
  const out = [];
  for (let cursor; ;) {
    const j = await api('GET', `${p}?limit=100${cursor ? '&cursor=' + cursor : ''}`);
    out.push(...j.data);
    if (!(cursor = j.nextCursor)) return out;
  }
};

// Original ids in the exports -> names, so they can be remapped to whatever the target instance uses.
const TABLES = {
  A8MTWlClXgMKbxXi: ['otr_order_context', ['order_ref', 'order_id', 'status', 'context']],
  bDV4O3vt5BIv0eH8: ['otr_cases', ['order_ref', 'status', 'owner', 'summary']],
  '10kfbsSMe2AIs1CT': ['otr_timeline', ['order_ref', 'actor', 'kind', 'text', 'source_ref']],
  yy3neHejmWqEtPKG: ['otr_proposals', ['order_ref', 'action', 'payload', 'rationale', 'evidence_refs', 'status', 'basis', 'decided_by', 'decision_note', 'result']],
  PlanStepsTable01: ['otr_plan_steps', ['order_ref', 'proposal_id', 'step_no', 'kind', 'detail', 'status', 'ref', 'attempts', 'note', 'updated_by']],
  SettingsTable001: ['otr_settings', ['key', 'value', 'unit', 'section', 'description']],
  ContactsTable001: ['otr_contacts', ['person_key', 'role', 'name', 'order_ref', 'chat_id', 'kind', 'language', 'timezone']],
  MessagesTable001: ['otr_messages', ['order_ref', 'direction', 'person_key', 'role', 'chat_id', 'tg_message_id', 'reply_to_tg_id', 'proposal_id', 'kind', 'text', 'buttons', 'status']],
  PromptFixTable01: ['otr_prompt_fixes', ['order_ref', 'agent', 'complaint', 'base_version', 'version', 'why', 'status', 'test_summary', 'decided_by']],
  WaitsTable000001: ['otr_waits', ['order_ref', 'who', 'person_key', 'about', 'ref', 'workflow', 'since', 'reminders', 'state', 'valid_until', 'last_reminded']],
};
const LF_HOST = (process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/$/, '');
const LF_DOMAIN = new URL(LF_HOST).hostname;
const LF = Boolean(process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY);
const CREDS = {
  HUqgy3AT7tyoG0PB: { name: 'BAHN OpenRouter', type: 'openRouterApi', data: { apiKey: process.env.OPENROUTER_API_KEY, allowedHttpRequestDomains: 'domains', allowedDomains: 'openrouter.ai' } },
  VtTRH9NSbaI7ARnO: { name: 'BAHN Fastino', type: 'httpHeaderAuth', data: { name: 'X-API-Key', value: process.env.FASTINO_API_KEY, allowedHttpRequestDomains: 'domains', allowedDomains: 'api.fastino.ai' } },
  LangfuseBasic001: { name: 'BAHN Langfuse', type: 'httpBasicAuth', data: { user: process.env.LANGFUSE_PUBLIC_KEY || 'not-set', password: process.env.LANGFUSE_SECRET_KEY || 'not-set', allowedHttpRequestDomains: 'domains', allowedDomains: LF_DOMAIN } },
};
const W = (f) => fs.readFileSync(path.join(here, 'workflows', f), 'utf8');
const include = (raw) => raw.replace(/\/\/ @include ([\w.-]+)/g, (_, f) => JSON.stringify(W('lib/' + f)).slice(1, -1));
const SETTING_DEFAULTS = new Function(W('lib/settings.js') + '; return SETTING_DEFAULTS;')();
const STAGES = new Function(W('lib/plan.js') + '; return STAGES;')();
const AGENTS = JSON.parse(W('agents/tools.json'));
const agentPrompt = (key) => `${W('agents/_shared.md').trim()}

${W(`agents/${key}.md`).trim()}

YOUR STAGES (in order; call log_stage when you finish one): ${Object.entries(STAGES[key]).map(([s, d]) => `${s} = ${d}`).join('; ')}.`;
// One problem workflow from the template: its label, prompt (_shared.md + <name>.md) and only the tools tools.json lists.
const agentJson = (key) => {
  const t = JSON.parse(W('problem_agent.template.json'));
  const { label, tools } = AGENTS[key];
  const isTool = (n) => n.type === '@n8n/n8n-nodes-langchain.toolWorkflow';
  const missing = tools.filter((x) => !t.nodes.some((n) => isTool(n) && n.name === x));
  if (missing.length) throw new Error(`agents/tools.json ${key}: no tool node ${missing.join(', ')} in the template`);
  t.name = t.name.replace('{{LABEL}}', label);
  t.id = `Otr${key[0].toUpperCase()}${key.slice(1)}Wf01`;
  t.nodes = t.nodes.filter((n) => !isTool(n) || tools.includes(n.name));
  for (const n of Object.keys(t.connections)) if (!t.nodes.some((x) => x.name === n)) delete t.connections[n];
  t.nodes.find((n) => n.name === 'Load prompt').parameters.url = `${LF_HOST}/api/public/v2/prompts/bahn-agent-${key}`;
  t.nodes.find((n) => n.name === 'Prompt').parameters.jsCode = `// Live prompt: Langfuse "bahn-agent-${key}", label production. Repo text when Langfuse is unreachable or not set up.
const REPO = ${JSON.stringify(agentPrompt(key))};
const lf = $json, ok = typeof lf.prompt === 'string' && lf.prompt.includes('YOUR STAGES');
return [{ json: { ...$('Start').first().json, system: ok ? lf.prompt : REPO, prompt_version: ok ? 'langfuse v' + lf.version : 'repo' } }];`;
  return JSON.stringify(t).replaceAll('{{KEY}}', key);
};
// Sub-workflows first, so their new ids exist before the workflows that call them. Journey is the first agent: others call it.
// New workflows carry placeholder ids (PlanRebookingWf1, Otr...Wf01) that are swapped the same way; Otr ids also sit inside
// Code strings (the router's workflow map), so they are swapped bare, not only as quoted JSON values.
const ORDER = ['get_order_context', 'plan_rebooking', 'simulated_driver', 'sim_person', 'tg_send', 'message_driver', 'propose_action', 'close_case',
  'check_journey', 'plan_driver_travel', 'escalate_urgent', 'tg_inbound', 'tg_poll', 'otr_reminders', 'propose_plan', 'log_stage', 'check_note', ...Object.keys(AGENTS).map((k) => 'agent:' + k),
  'on_the_road_agent', 'act_proposal_decision', 'plan_step', 'tool_test_hooks', 'driver_report', 'prompt_fix'];
// Replaced workflows: deactivated, never deleted. propose_rebooking -> propose_plan; escalate_urgent -> create_employee_task (same file).
const RETIRED = ['BAHN tool · propose_rebooking', 'BAHN tool · escalate_urgent'];
const norm = (name) => name.replace(/�/g, '·'); // names created through an earlier tool lost the middle dot
const remap = (s) => Object.entries(idMap).reduce((t, [o, n]) => /^Otr\w+Wf\d+$/.test(o) ? t.replaceAll(o, n) : t.replaceAll(`"${o}"`, `"${n}"`), s);

const idMap = {};

const tables = await listAll('/data-tables');
for (const [oldId, [name, cols]] of Object.entries(TABLES)) {
  let t = tables.find((x) => x.name === name);
  if (!t) t = await api('POST', '/data-tables', { name, columns: cols.map((c) => ({ name: c, type: 'string' })) });
  idMap[oldId] = t.id;
  console.log(`table ${name}: ${t.id}`);
}

// Settings: add missing keys only, so values edited on the control room Settings page survive a re-run.
const have = new Set((await api('GET', `/data-tables/${idMap.SettingsTable001}/rows?limit=250`)).data.map((r) => r.key));
const add = Object.entries(SETTING_DEFAULTS).filter(([k]) => !have.has(k))
  .map(([key, [value, unit, section, description]]) => ({ key, value: String(value), unit, section, description }));
if (add.length) await api('POST', `/data-tables/${idMap.SettingsTable001}/rows`, { data: add });
// Keys no longer in lib/settings.js (renamed or removed) are dropped so the Settings page shows only live ones.
const gone = [...have].filter((k) => !(k in SETTING_DEFAULTS));
for (const key of gone) await api('DELETE', `/data-tables/${idMap.SettingsTable001}/rows/delete?filter=${encodeURIComponent(JSON.stringify(
  { type: 'and', filters: [{ columnName: 'key', condition: 'eq', value: key }] }))}`);
console.log(`settings: ${add.length} added, ${gone.length} removed (${gone.join(', ') || 'none'}), ${have.size - gone.length} kept`);

const creds = await listAll('/credentials');
for (const [oldId, c] of Object.entries(CREDS)) {
  let x = creds.find((k) => k.name === c.name && k.type === c.type);
  if (!x) x = await api('POST', '/credentials', c);
  // Keys added to .env after the first run: refresh the Langfuse login (the others keep their stored values).
  else if (oldId === 'LangfuseBasic001' && LF) await api('PATCH', `/credentials/${x.id}`, { name: c.name, type: c.type, data: c.data });
  idMap[oldId] = x.id;
  console.log(`credential ${c.name}: ${x.id}`);
}

// Langfuse prompts. config.repo_hash marks which repo text a version came from, so a re-run with an unchanged repo file
// adds nothing, and a promoted fix (it keeps its base's repo_hash) is not overwritten by the repo text.
if (LF) {
  const lfApi = async (method, p, body) => {
    const r = await fetch(LF_HOST + '/api/public/v2/prompts' + p, { method, body: body && JSON.stringify(body), headers: {
      Authorization: 'Basic ' + Buffer.from(process.env.LANGFUSE_PUBLIC_KEY + ':' + process.env.LANGFUSE_SECRET_KEY).toString('base64'), 'Content-Type': 'application/json' } });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Langfuse ${method} ${p} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  };
  for (const key of Object.keys(AGENTS)) {
    const name = 'bahn-agent-' + key, prompt = agentPrompt(key);
    const repo_hash = createHash('sha256').update(prompt).digest('hex').slice(0, 12);
    const prod = await lfApi('GET', `/${name}?label=production`);
    const cand = prod && await lfApi('GET', `/${name}?label=candidate`);
    let did = 'in sync';
    if (!prod) { await lfApi('POST', '', { name, type: 'text', prompt, labels: ['production'], config: { repo_hash }, commitMessage: 'From the repo (agents/' + key + '.md)' }); did = 'created (production)'; }
    else if (prod.config?.repo_hash !== repo_hash && cand?.config?.repo_hash !== repo_hash) {
      await lfApi('POST', '', { name, type: 'text', prompt, labels: ['candidate'], config: { repo_hash }, commitMessage: 'Repo file changed (agents/' + key + '.md)' }); did = 'repo change saved as candidate';
    }
    console.log(`langfuse ${name}: ${did}`);
  }
} else console.log('langfuse: LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY not set; agents use the repo prompts');

const existing = await listAll('/workflows');
for (const file of ORDER) {
  const raw = include(file.startsWith('agent:') ? agentJson(file.slice(6)) : W(file + '.json')).replaceAll('{{LANGFUSE_HOST}}', LF_HOST);
  const own = JSON.parse(raw).id;
  const text = remap(raw);
  const left = text.replaceAll(`"id": "${own}"`, '').replaceAll(`"id":"${own}"`, '').match(/(Otr\w+Wf\d+|PlanRebookingWf1|PlanStepActWf001)/);
  if (left) throw new Error(`${file}: placeholder ${left[1]} has no workflow yet (check ORDER)`);
  const wf = JSON.parse(text);
  const body = { name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || { executionOrder: 'v1' } };
  const found = existing.find((w) => norm(w.name) === wf.name && !w.isArchived);
  const saved = found ? await api('PUT', `/workflows/${found.id}`, body) : await api('POST', '/workflows', body);
  if (wf.id) idMap[wf.id] = saved.id;
  await api('POST', `/workflows/${saved.id}/activate`);
  console.log(`workflow ${wf.name}: ${saved.id} (${found ? 'updated' : 'created'}, active)`);
}

for (const name of RETIRED) {
  const w = existing.find((x) => norm(x.name) === name && !x.isArchived && x.active);
  if (w) { await api('POST', `/workflows/${w.id}/deactivate`); console.log(`workflow ${name}: ${w.id} deactivated (retired, kept)`); }
}

if (process.argv.includes('--seed')) {
  const r = spawnSync(process.execPath, [path.join(here, 'seed.mjs'), '--reset-cases'], { stdio: 'inherit', env: process.env });
  if (r.status) process.exit(r.status);
}
console.log('done');
