// Seeds the n8n Data Tables used by the On-the-road agent from the synthetic Bahn dataset.
// Usage: N8N_API_URL=http://127.0.0.1:5678 N8N_API_KEY=... node BAHN/build/n8n/seed.mjs [--reset-cases]
// --reset-cases also clears otr_cases, otr_timeline, otr_proposals, otr_plan_steps, otr_messages and otr_waits and restarts
// the demo clock (otr_settings demo_clock_started_at = now), so "now" starts again at the dataset time (fresh demo).
// Rows: one per order (CD-...) plus the driver roster (REF-DRIVERS), built in dataset.mjs.
import { buildRows } from './dataset.mjs';

const API = (process.env.N8N_API_URL || 'http://127.0.0.1:5678') + '/api/v1';
const H = { 'X-N8N-API-KEY': process.env.N8N_API_KEY, 'Content-Type': 'application/json' };

const api = async (method, p, body) => {
  const r = await fetch(API + p, { method, headers: H, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : {};
};

const rows = buildRows();
const tables = (await api('GET', '/data-tables?limit=100')).data;
const tid = (name) => tables.find((t) => t.name === name)?.id || (() => { throw new Error('missing table ' + name); })();
const clear = (name, like = 'CD-%') => api('DELETE', `/data-tables/${tid(name)}/rows/delete?filter=${encodeURIComponent(JSON.stringify(
  { type: 'and', filters: [{ columnName: 'order_ref', condition: 'like', value: like }] }))}`);

await clear('otr_order_context');
await clear('otr_order_context', 'REF-%');
for (let i = 0; i < rows.length; i += 25) await api('POST', `/data-tables/${tid('otr_order_context')}/rows`, { data: rows.slice(i, i + 25) });
if (process.argv.includes('--reset-cases')) {
  for (const t of ['otr_cases', 'otr_timeline', 'otr_proposals', 'otr_plan_steps', 'otr_messages', 'otr_waits']) await clear(t);
  await api('PATCH', `/data-tables/${tid('otr_settings')}/rows/update`, { filter: { type: 'and', filters: [{ columnName: 'key', condition: 'eq', value: 'demo_clock_started_at' }] },
    data: { value: new Date().toISOString() } });
  console.log('case tables cleared; demo clock restarted at the dataset time');
}
console.log(`seeded ${rows.length - 1} orders + driver roster into otr_order_context`);
