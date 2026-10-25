// Builds the per-order context rows (otr_order_context) and the driver roster from the synthetic Bahn dataset.
// Used by seed.mjs (loads them into n8n) and test_workflows.mjs (runs Code nodes offline against them).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(here, '../../context/car-delivery-control-room/dataset/data');
export const SNAPSHOT_NOW = '2026-10-21T09:00:00Z';

const load = (name) => fs.readFileSync(path.join(DATA, name + '.jsonl'), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));
const byOrder = (rows) => rows.reduce((m, r) => ((m[r.order_id] ||= []).push(r), m), {});
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
const byTime = (k) => (a, b) => String(a[k]).localeCompare(String(b[k]));

export function buildRows() {
  const orders = load('orders');
  const customers = byId(load('customers'));
  const driverRows = load('drivers');
  const drivers = byId(driverRows);
  const vehicles = byId(load('vehicles'));
  const sites = byId(load('sites'));
  const addresses = byId(load('addresses'));
  const perOrder = Object.fromEntries([
    'alerts', 'incidents', 'messages', 'conversations', 'work_assignments', 'work_items', 'order_notes',
    'tracking_observations', 'travel_options', 'travel_reservations', 'ferry_terminal_events',
    'time_windows', 'agent_proposals', 'order_items', 'expenses', 'operational_events',
    'travel_confirmations', 'custody_reports', 'site_visits', 'order_endpoint_details', 'transport_plans', 'assignment_steps',
  ].map((t) => [t, byOrder(load(t))]));
  const byPlan = (rows) => rows.reduce((m, r) => ((m[r.plan_id] ||= []).push(r), m), {});
  const points = byPlan(load('transport_points')), segments = byPlan(load('transport_segments'));

  const place = (siteId, addrId) => {
    const s = sites[siteId], a = addresses[addrId];
    return s ? { site: s.name, city: s.city, country: s.country, timezone: s.timezone || a?.timezone, opening_hours: s.opening_hours, access_note: s.delivery_access_note || s.access_note }
      : a ? { name: a.name, city: a.city, country: a.country, timezone: a.timezone, opening_hours: a.opening_hours, access_note: a.access_note } : null;
  };

  const rows = orders.map((o) => {
    const g = (t) => perOrder[t][o.id] || [];
    const assignments = g('work_assignments').map((w) => ({ ...w, driver: drivers[w.driver_id]?.display_name }));
    const cust = customers[o.customer_id];
    // Buyer language: the one they wrote in most (latest wins a tie), English if they never wrote.
    const said = g('messages').filter((m) => m.author_type === 'customer').sort(byTime('authored_at')).map((m) => m.language);
    const lang = said.reduce((best, l) => (said.filter((x) => x === l).length >= said.filter((x) => x === best).length ? l : best), 'en');
    const contact = (b) => { const e = g('order_endpoint_details').find((x) => x.boundary === b); return e && { name: e.contact_name, role: e.contact_role, status: e.contact_status, access_instruction: e.access_instruction }; };
    // The order's planned route (active plan, else the latest): stops, legs and the driver's scheduled steps. Re-plans start from it.
    const plan = g('transport_plans').find((x) => x.id === o.active_plan_id) || g('transport_plans').sort(byTime('created_at')).at(-1);
    const stop = Object.fromEntries((plan ? points[plan.id] || [] : []).map((p) => [p.id, { ...place(p.site_id, p.address_id), role: p.role, sequence: p.sequence }]));
    const route_plan = plan && { id: plan.id, status: plan.status, version: plan.version, source: plan.source,
      stops: Object.values(stop).sort((a, b) => a.sequence - b.sequence),
      legs: (segments[plan.id] || []).sort((a, b) => a.sequence - b.sequence).map((x) => ({ sequence: x.sequence, from: stop[x.from_point_id]?.city, to: stop[x.to_point_id]?.city, mode: x.transport_mode, distance_km: x.distance_km, status: x.status })),
      driver_steps: g('assignment_steps').sort((a, b) => a.sequence - b.sequence).map((x) => ({ sequence: x.sequence, kind: x.kind, title: x.title, status: x.status, from_city: x.from_city, to_city: x.to_city, scheduled_start_at: x.scheduled_start_at, scheduled_end_at: x.scheduled_end_at, reservation_id: x.reservation_id })) };
    const context = {
      snapshot_now: SNAPSHOT_NOW,
      order: o,
      customer: cust && { id: cust.id, name: cust.name, tier: cust.account_tier, language: lang, contact_rule: 'The buyer (customer) pays. Agent must never contact them on its own; a person approves every buyer message.' },
      delivery_contact: contact('DELIVERY'), pickup_contact: contact('PICKUP'),
      vehicles: g('order_items').map((i) => vehicles[i.vehicle_id]).filter(Boolean),
      pickup: place(o.pickup_site_id, o.pickup_address_id),
      delivery: place(o.delivery_site_id, o.delivery_address_id),
      route_plan: route_plan || null,
      time_windows: g('time_windows').filter((w) => w.is_selected),
      assignments,
      alerts: g('alerts'), incidents: g('incidents'), work_items: g('work_items'),
      messages: g('messages').sort(byTime('authored_at')),
      order_notes: g('order_notes'),
      tracking_latest: g('tracking_observations').sort(byTime('observed_at')).slice(-4),
      travel_options: g('travel_options'), travel_reservations: g('travel_reservations'),
      travel_confirmations: g('travel_confirmations'), ferry_terminal_events: g('ferry_terminal_events'),
      expenses: g('expenses'), custody_reports: g('custody_reports'), site_visits: g('site_visits'),
      past_agent_proposals: g('agent_proposals'),
      recent_events: g('operational_events').sort(byTime('recorded_at')).slice(-15),
    };
    return { order_ref: o.reference, order_id: o.id, status: o.status, context: JSON.stringify(context) };
  });

  // Driver roster for replacement search: busy = on an ASSIGNED or IN_PROGRESS job at snapshot time.
  const busy = new Set(Object.values(perOrder.work_assignments).flat().filter((w) => ['ASSIGNED', 'IN_PROGRESS'].includes(w.status)).map((w) => w.driver_id));
  const roster = driverRows.map((d) => ({ id: d.id, display_name: d.display_name, home_city: d.home_city, home_country: d.home_country, active: d.active, busy: busy.has(d.id) }));
  rows.push({ order_ref: 'REF-DRIVERS', order_id: '', status: 'reference', context: JSON.stringify({ snapshot_now: SNAPSHOT_NOW, drivers: roster }) });
  return rows;
}
