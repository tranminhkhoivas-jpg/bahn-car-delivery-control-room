// Promptfoo provider: replays one problem agent on an event with a chosen Langfuse prompt version, side-effect free.
// Same model and tool list as the n8n agent (tools read from workflows/problem_agent.template.json + agents/tools.json).
// Read-only tools run for real through the n8n test hooks; tools that send, file, close or log are recorded, not run.
// Output: every tool call with its arguments, then the agent's final reply. Graded by the asserts in run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const W = (f) => JSON.parse(fs.readFileSync(path.join(here, '../workflows', f), 'utf8'));
const READ_ONLY = ['get_order_context', 'check_journey', 'plan_rebooking', 'plan_driver_travel'];
const MOCK = {
  message_driver: { test_replay: true, sent: false, reply: '(test replay: the driver has not answered yet)' },
  propose_plan: { test_replay: true, ok: true, note: 'plan recorded for the test, not filed' },
};

// $fromAI('name', 'description', 'type') inside the tool node's inputs = the tool's parameters.
function toolDefs(agent) {
  const nodes = W('problem_agent.template.json').nodes;
  return W('agents/tools.json')[agent].tools.map((name) => {
    const n = nodes.find((x) => x.name === name);
    const props = {};
    for (const v of Object.values(n.parameters.workflowInputs?.value || {})) {
      for (const m of String(v).matchAll(/\$fromAI\('(\w+)',\s*(['"])([\s\S]*?)\2,\s*'(\w+)'\)/g)) props[m[1]] = { type: m[4] === 'number' ? 'number' : 'string', description: m[3] };
    }
    return { type: 'function', function: { name, description: n.parameters.description, parameters: { type: 'object', properties: props } } };
  });
}

async function langfusePrompt(agent, version) {
  const host = (process.env.LANGFUSE_HOST || process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\/$/, '');
  const auth = Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString('base64');
  const param = version != null && String(version).trim() ? `version=${version}` : 'label=production';
  const r = await fetch(`${host}/api/public/v2/prompts/bahn-agent-${agent}?${param}`, { headers: { Authorization: 'Basic ' + auth } });
  if (!r.ok) throw new Error(`Langfuse prompt bahn-agent-${agent} ${param}: ${r.status}`);
  return (await r.json()).prompt;
}

async function runTool(name, args) {
  if (!READ_ONLY.includes(name)) return MOCK[name] || { test_replay: true, ok: true };
  const r = await fetch(`${process.env.N8N_API_URL || 'http://127.0.0.1:5678'}/webhook/bahn/test/${name}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(name === 'get_order_context' ? { ...args, view: 'agent' } : args) }); // same trimmed view as the n8n agent tool
  return (await r.text()).slice(0, 8000);
}

export default class AgentReplay {
  constructor(options = {}) {
    this.config = options.config || {};
    this.label = this.config.label || options.label || options.id || 'replay';
  }
  id() { return this.label; }
  async callApi(_prompt, context) {
    const { agent, input } = context.vars;
    const messages = [{ role: 'system', content: await langfusePrompt(agent, this.config.version) }, { role: 'user', content: input }];
    const tools = toolDefs(agent), log = [];
    // ponytail: 14 model turns cap (the n8n agent allows 20); enough for one event.
    for (let turn = 0; turn < 14; turn++) {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'anthropic/claude-haiku-5.5', temperature: 0.2, max_tokens: 4096, messages, tools }) });
      if (!r.ok) return { error: `OpenRouter ${r.status}: ${(await r.text()).slice(0, 300)}` };
      const msg = (await r.json()).choices[0].message;
      messages.push(msg);
      if (!msg.tool_calls?.length) { log.push(`FINAL REPLY: ${msg.content || ''}`); break; }
      for (const call of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* model sent bad JSON: pass it on empty */ }
        log.push(`CALL ${call.function.name} ${JSON.stringify(args)}${READ_ONLY.includes(call.function.name) ? '' : '  (recorded only, test replay)'}`);
        const result = await runTool(call.function.name, args);
        messages.push({ role: 'tool', tool_call_id: call.id, content: typeof result === 'string' ? result : JSON.stringify(result) });
      }
    }
    return { output: log.join('\n') };
  }
}
