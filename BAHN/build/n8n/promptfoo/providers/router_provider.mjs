// Promptfoo provider: runs the LIVE router logic on one event text, side-effect free.
// Executes the exact Code of nodes "Classify" and "Route" from workflows/on_the_road_agent.json (no copy to drift),
// calls GLiDE with the body Classify builds, and reads the routing cut-off from the real Settings via the
// get_order_context test hook. Output: the chosen workflows, comma-joined, then the router's route line.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const N8N = process.env.N8N_API_URL || 'http://127.0.0.1:5678';
const nodes = JSON.parse(fs.readFileSync(path.join(here, '../../workflows/on_the_road_agent.json'), 'utf8')).nodes;
const code = (name) => nodes.find((n) => n.name === name).parameters.jsCode;

// Runs an n8n Code node body with $json and $('Node') stubbed from `inputs`.
function runNode(name, inputs, $json = {}) {
  const $ = (n) => ({ isExecuted: n in inputs, first: () => ({ json: inputs[n] }) });
  return new Function('$', '$json', code(name))($, $json)[0].json;
}

export default class RouterProvider {
  constructor(options = {}) { this.label = options.config?.label || options.label || options.id || 'router'; }
  id() { return this.label; }
  async callApi(_prompt, context) {
    const text = context.vars.event || context.vars.input || _prompt;
    const order_ref = context.vars.order_ref || 'CD-420299';
    const ctx = await (await fetch(`${N8N}/webhook/bahn/test/get_order_context`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_ref }) })).json();
    const Normalize = { text, order_ref, kind: 'event', source: 'test', run_id: 'promptfoo', workflows: [] };
    const Classify = runNode('Classify', { Normalize }, ctx);
    const r = await fetch('https://api.fastino.ai/v1/systemone', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FASTINO_API_KEY },
      body: JSON.stringify(Classify.glide_body) });
    const inputs = { Normalize, Classify, 'Get context': { ...ctx, case_timeline: [] } }; // ponytail: fresh case, so no join/follow-up effects
    if (r.ok) inputs.GLiDE = await r.json();
    const route = runNode('Route', inputs);
    return { output: `${route.workflows.join(', ')}\n${route.route_text}` };
  }
}
