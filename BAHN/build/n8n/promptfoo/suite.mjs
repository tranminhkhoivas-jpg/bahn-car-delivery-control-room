// Promptfoo regression test runner: runs the 25-case suite covering routing, GLiDE checks, agent safety, and tool guards.
// Usage: node BAHN/build/n8n/promptfoo/suite.mjs
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

const outDir = path.join(here, 'out');
fs.mkdirSync(outDir, { recursive: true });
const resFile = path.join(outDir, 'suite.result.json');
if (fs.existsSync(resFile)) fs.unlinkSync(resFile);

console.log('Running Promptfoo regression suite (25 cases)...');
const run = spawnSync('npx', ['-y', 'promptfoo@0.125.0', 'eval', '-c', 'suite.yaml', '-o', 'out/suite.result.json', '--no-cache', '--no-table', '-j', '2'], {
  cwd: here,
  env: { ...process.env, PROMPTFOO_DISABLE_TELEMETRY: '1', PROMPTFOO_DISABLE_UPDATE: '1' },
  encoding: 'utf8',
  shell: true,
  timeout: 20 * 60 * 1000,
});

if (!fs.existsSync(resFile)) {
  console.error('Promptfoo failed to generate output:');
  console.error((run.stderr || run.stdout || '').slice(-800));
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(resFile, 'utf8'));
const results = data.results?.results || [];

const groups = {
  a: { name: 'Routing', items: [] },
  b: { name: 'GLiDE checks', items: [] },
  c: { name: 'Agent safety', items: [] },
  d: { name: 'Tool guards', items: [] },
};

for (const r of results) {
  const desc = r.testCase?.description || '';
  if (desc.startsWith('routing -')) groups.a.items.push(r);
  else if (desc.startsWith('glide -')) groups.b.items.push(r);
  else if (desc.startsWith('agent safety -')) groups.c.items.push(r);
  else if (desc.startsWith('tool guard -')) groups.d.items.push(r);
  else groups.c.items.push(r);
}

const totalPassed = results.filter((r) => r.success).length;
console.log(`\n======================================================`);
console.log(`SUITE SUMMARY: ${totalPassed}/${results.length} PASSED`);
console.log(`Group a (Routing): ${groups.a.items.filter((r) => r.success).length}/${groups.a.items.length}`);
console.log(`Group b (GLiDE checks): ${groups.b.items.filter((r) => r.success).length}/${groups.b.items.length}`);
console.log(`Group c (Agent safety): ${groups.c.items.filter((r) => r.success).length}/${groups.c.items.length}`);
console.log(`Group d (Tool guards): ${groups.d.items.filter((r) => r.success).length}/${groups.d.items.length}`);
console.log(`======================================================\n`);

console.log('GLiDE SCORES (Group b):');
for (const r of groups.b.items) {
  let score = 'N/A';
  try {
    const raw = typeof r.response?.output === 'string' ? JSON.parse(r.response.output) : r.response?.output;
    score = raw?.score !== undefined ? Number(raw.score).toFixed(4) : 'N/A';
  } catch {}
  console.log(`- ${r.testCase?.description}: score = ${score} (${r.success ? 'PASS' : 'FAIL'})`);
}

const agentFailures = groups.c.items.filter((r) => !r.success);
if (agentFailures.length) {
  console.log('\nAGENT FINDINGS (Failures):');
  for (const f of agentFailures) {
    console.log(`- [${f.testCase?.description}]: ${f.gradingResult?.reason || f.error || 'Failed assertion'}`);
  }
} else {
  console.log('\nAgent findings: all 8 agent safety checks passed without failures.');
}

if (totalPassed < results.length) {
  process.exitCode = 1;
}
