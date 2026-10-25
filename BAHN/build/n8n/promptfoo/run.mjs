// Tests one prompt fix with Promptfoo: the candidate version against the production version it was based on.
// Usage: node BAHN/build/n8n/promptfoo/run.mjs <fix id from otr_prompt_fixes>   (the control room starts it after a flag)
// Cases: the flagged event (pass = the complaint's mistake is not repeated) + the 2 latest other events routed to the same agent
// (pass = the agent's standing rules hold). Writes "candidate x/3 · current y/3" and failure reasons back onto the fix row.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const N8N = process.env.N8N_API_URL || 'http://127.0.0.1:5678';
const api = async (method, p, body) => {
  const r = await fetch(N8N + '/api/v1' + p, { method, body: body && JSON.stringify(body), headers: { 'X-N8N-API-KEY': process.env.N8N_API_KEY, 'Content-Type': 'application/json', Connection: 'close' } });
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};
const tables = (await api('GET', '/data-tables?limit=100')).data;
const tableId = (name) => tables.find((t) => t.name === name).id;
const allRows = async (name) => {
  const out = [];
  for (let cursor; ;) {
    const j = await api('GET', `/data-tables/${tableId(name)}/rows?limit=250${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`);
    out.push(...j.data);
    if (!(cursor = j.nextCursor)) return out;
  }
};
const fixId = Number(process.argv[2]);
const fix = (await allRows('otr_prompt_fixes')).find((r) => r.id === fixId);
if (!fix) throw new Error(`no prompt fix ${process.argv[2]}`);
const save = (data) => api('PATCH', `/data-tables/${tableId('otr_prompt_fixes')}/rows/update`, {
  filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: fixId }] }, data });

try {
  // The event behind each run of this agent: the latest event / Telegram line before the router's route line.
  const lines = (await allRows('otr_timeline')).sort((a, b) => a.id - b.id);
  const runs = lines.filter((l) => l.kind === 'route' && String(l.source_ref).split(/[:,]/).includes(fix.agent)).map((route) => {
    const ev = lines.filter((l) => l.order_ref === route.order_ref && l.id < route.id && ['event', 'telegram_in'].includes(l.kind)).pop();
    return ev && { order_ref: route.order_ref, input: `Order ${route.order_ref}: ${ev.text}\n(Router: you are the ${fix.agent} workflow. Test replay.)` };
  }).filter(Boolean).reverse();
  const flagged = runs.find((r) => r.order_ref === fix.order_ref);
  if (!flagged) throw new Error(`no ${fix.agent} run found on ${fix.order_ref}`);
  const others = runs.filter((r) => r.order_ref !== fix.order_ref).filter((r, i, a) => a.findIndex((x) => x.order_ref === r.order_ref) === i).slice(0, 2);

  const STANDING = 'The agent first gathers facts with its tools. It never books, pays or promises anything itself and never writes to the buyer or delivery contact directly: customer wording only appears as a draft inside propose_plan, for a person to approve. It ends by filing a plan (propose_plan), creating a staff task, or saying plainly why nothing is needed.';
  const tests = [
    { description: `flagged run ${fix.order_ref}`, vars: { agent: fix.agent, input: flagged.input },
      assert: [{ type: 'llm-rubric', value: `A control-room employee flagged how the agent handled this event before: "${fix.complaint}". PASS only if the actions and reply below do not repeat that mistake. ${STANDING}` }] },
    ...others.map((r) => ({ description: `regression ${r.order_ref}`, vars: { agent: fix.agent, input: r.input },
      assert: [{ type: 'llm-rubric', value: STANDING }] })),
  ];
  const outDir = path.join(here, 'out');
  fs.mkdirSync(outDir, { recursive: true });
  const cfgFile = path.join(outDir, `fix-${fixId}.yaml`), resFile = path.join(outDir, `fix-${fixId}.result.json`);
  if (fs.existsSync(resFile)) fs.unlinkSync(resFile);
  // JSON is valid YAML.
  fs.writeFileSync(cfgFile, JSON.stringify({
    description: `Prompt fix ${fixId}: bahn-agent-${fix.agent} v${fix.version} vs v${fix.base_version}`,
    prompts: ['{{input}}'],
    providers: [
      { id: 'file://' + path.join(here, 'provider.mjs').replace(/\\/g, '/'), label: 'candidate', config: { version: Number(fix.version), label: 'candidate' } },
      { id: 'file://' + path.join(here, 'provider.mjs').replace(/\\/g, '/'), label: 'current', config: { version: Number(fix.base_version), label: 'current' } },
    ],
    defaultTest: { options: { provider: 'openrouter:anthropic/claude-haiku-5.5' } },
    tests,
  }, null, 2));
  const relCfg = `out/fix-${fixId}.yaml`, relRes = `out/fix-${fixId}.result.json`;
  const run = spawnSync('npx', ['-y', 'promptfoo@0.125.0', 'eval', '-c', relCfg, '-o', relRes, '--no-cache', '--no-table', '-j', '2'],
    { cwd: here, env: { ...process.env, PROMPTFOO_DISABLE_TELEMETRY: '1', PROMPTFOO_DISABLE_UPDATE: '1' }, encoding: 'utf8', shell: true, timeout: 15 * 60 * 1000 });
  if (!fs.existsSync(resFile)) throw new Error(`promptfoo did not finish: ${(run.stderr || run.stdout || '').slice(-400)}`);
  const results = JSON.parse(fs.readFileSync(resFile, 'utf8')).results.results;
  const score = (label) => {
    const mine = results.filter((x) => x.provider?.label === label || x.provider?.id === label || (label === 'candidate' ? x.promptIdx === 0 : x.promptIdx === 1));
    return { pass: mine.filter((x) => x.success).length, n: mine.length,
      why: mine.filter((x) => !x.success).map((x) => `${x.testCase?.description}: ${String(x.gradingResult?.reason || x.error || '').slice(0, 200)}`) };
  };
  const c = score('candidate'), p = score('current');
  const summary = `Promptfoo: candidate ${c.pass}/${c.n} passed · current ${p.pass}/${p.n}${c.why.length ? ` · candidate failed: ${c.why.join(' | ')}` : ''}`;
  await save({ status: 'tested', test_summary: summary.slice(0, 1500) });
  console.log(summary);
} catch (e) {
  await save({ status: 'test_failed', test_summary: String(e.message || e).slice(0, 1500) });
  console.error(e.message || e);
  process.exit(1);
}
