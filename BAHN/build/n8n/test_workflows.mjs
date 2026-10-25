// Offline checks of the On-the-road Code nodes (router, coordinator, journey check, driver travel, plan, executor, employee task, plan rules).
// Usage: node BAHN/build/n8n/test_workflows.mjs   (no n8n needed; runs each node's code against the dataset)
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { buildRows } from './dataset.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const include = (src) => src.replace(/\/\/ @include ([\w.-]+)/g, (_, f) => fs.readFileSync(path.join(here, 'workflows/lib', f), 'utf8'));
const settings = new Function(include('// @include settings.js') + '; return readSettings([]);')(); // placeholder defaults
const rows = buildRows();
const roster = rows.find((r) => r.order_ref === 'REF-DRIVERS');
const ctx = (ref, extra = {}) => ({ found: true, order_ref: ref, snapshot: JSON.parse(rows.find((r) => r.order_ref === ref).context), settings: { ...settings }, case_timeline: [], case_proposals: [], plan_steps: [], conversation: [], waits: [], ...extra });
// Run one Code node: `nodes` maps node names to their output (object = one item, array = items); `json` is $json.
const run = (file, node, nodes, json) => {
  const w = JSON.parse(fs.readFileSync(path.join(here, 'workflows', file), 'utf8'));
  const src = include(w.nodes.find((n) => n.name === node).parameters.jsCode);
  const $ = (n) => { const v = nodes[n]; const items = v === undefined ? [] : Array.isArray(v) ? v : [v];
    return { isExecuted: v !== undefined, first: () => ({ json: items[0] }), all: () => items.map((j) => ({ json: j })) }; };
  return new Function('$', '$json', src)($, json).map((x) => x.json);
};
const one = (...a) => run(...a)[0];

// ---------- router: classify + route ----------
const route = (ref, text, { kind = 'event', glide, timeline = [], workflows = [] } = {}) => {
  const n = { order_ref: ref, run_id: 'r1', kind, source: 'system', text, simulate: '', workflows };
  const c = ctx(ref, { case_timeline: timeline });
  const k = one('on_the_road_agent.json', 'Classify', { Normalize: n }, c);
  const g = glide && { answers: Object.fromEntries(Object.entries(glide).map(([q, v]) => [q, { noul: v }])) };
  return one('on_the_road_agent.json', 'Route', { Normalize: n, Classify: k, 'Get context': c, GLiDE: g }, c);
};
assert.deepEqual(route('CD-420322', 'Alert VEHICLE_WARNING and TRACKING_GAP on the car').workflows, ['vehicle', 'tracking'], 'codes map to workflows; tracking runs alongside');
const vl = route('CD-420322', 'VEHICLE_WARNING, now running late', { glide: { journey: 0.9 } });
assert.deepEqual(vl.workflows, ['vehicle'], 'root cause wins: vehicle + late = vehicle only');
assert(/journey dropped/.test(vl.route_text));
assert.deepEqual(route('CD-420806', 'no position for hours and will be late', { glide: { tracking: 0.8, journey: 0.7 } }).workflows, ['journey', 'tracking'], 'tracking + late = 2 workflows');
assert.deepEqual(route('CD-420537', 'DRIVER_AVAILABILITY_RISK driver unwell', { glide: { driver_cannot_continue: 0.9 } }).workflows, ['incident'], 'cannot continue = incident');
assert.deepEqual(route('CD-420537', 'DRIVER_AVAILABILITY_RISK needs rest', { glide: { driver_cannot_continue: 0.1 } }).workflows, ['journey'], 'rest only = journey');
assert.deepEqual(route('CD-420322', 'hello', { kind: 'chat', glide: {} }).workflows, ['general'], 'no category = general');
const open = [{ id: 5, kind: 'route', source_ref: 'route:vehicle,tracking' }];
const dup = route('CD-420322', 'VEHICLE_WARNING again', { timeline: open });
assert.equal(dup.items[0].session_id, 'case-CD-420322-vehicle-0', 'repeat event joins the open session');
assert(/joins the open case for vehicle/.test(dup.route_text));
assert.deepEqual(route('CD-420322', 'step done', { kind: 'follow_up', timeline: open }).workflows, ['vehicle', 'tracking'], 'follow-up returns to open workflows');
assert.deepEqual(route('CD-420322', 'what is this about?', { glide: {}, timeline: open }).workflows, ['general'], 'free text with no category goes to general, never guessed into an open workflow');
const wake = route('CD-420322', 'Plan #1 was rejected: too expensive', { kind: 'follow_up', timeline: open, workflows: ['vehicle', 'nonsense'] });
assert.deepEqual(wake.workflows, ['vehicle'], 'a wake-up names its workflows: exact routing');
assert.equal(wake.items[0].run_id, 'r1:vehicle', 'each workflow gets the run tag');
// Chat naming two orders is refused with a question.
const two = one('on_the_road_agent.json', 'Normalize', {}, { chatInput: 'CD-420322 and CD-420537 are late' });
assert(!two.order_ref && /One order per message/.test(two.error), 'two orders in one chat are refused');
const norm = one('on_the_road_agent.json', 'Normalize', {}, { body: { order_ref: 'cd-420322', source: 'follow_up', event: 'x', workflows: 'vehicle, incident' } });
assert(norm.run_id && norm.kind === 'follow_up' && norm.workflows.join() === 'vehicle,incident', 'wake-up workflows parsed');

// ---------- router: resume stage ----------
const stages = [{ id: 20, kind: 'stage', source_ref: 'stage:vehicle:safety', text: 'safety: driver safe on hard shoulder', at: 't1' },
  { id: 21, kind: 'stage', source_ref: 'stage:vehicle:facts_photo', text: 'facts_photo: warning light photo received', at: 't2' }];
const resumeRun = (glideAnswers, kind = 'follow_up', workflows = ['vehicle']) => {
  const n = { order_ref: 'CD-420322', run_id: 'r2', kind, source: 'system', text: 'Plan rejected: buyer has own roadside help', simulate: '', workflows };
  const c = ctx('CD-420322', { case_timeline: [...open, ...stages] });
  const r = one('on_the_road_agent.json', 'Route', { Normalize: n, Classify: { codes: [], code_workflows: [] }, 'Get context': c, GLiDE: undefined }, c);
  const p = one('on_the_road_agent.json', 'Resume prep', { Normalize: n, 'Get context': c }, r);
  return { p, out: one('on_the_road_agent.json', 'Resume', { Route: r, 'Resume prep': p, Normalize: n, 'Get context': c, 'GLiDE resume': glideAnswers && { answers: glideAnswers } }, null) };
};
const rs = resumeRun({ vehicle: { type: 'choice', choice: 'solution_question', confidence: 0.8 } });
assert.deepEqual(rs.p.ask, ['vehicle'], 'GLiDE asked only for workflows with finished stages');
assert.equal(rs.p.glide_body.questions.vehicle.type, 'choice');
assert(/Continue from stage: solution_question/.test(rs.out.items[0].input) && /safety: driver safe/.test(rs.out.items[0].input), 'agent input lists reused stages and where to continue');
assert(/vehicle from solution_question \(GLiDE 0.80\)/.test(rs.out.route_text));
const low = resumeRun({ vehicle: { choice: 'safety', confidence: 0.1 } });
assert(/Continue from stage: solution_question/.test(low.out.items[0].input), 'low confidence: first unfinished stage');
// Two workflows on a new event; vehicle still has plan lines waiting for a decision: GLiDE may keep them.
{
  const n = { order_ref: 'CD-420322', run_id: 'r9', kind: 'event', source: 'driver', text: 'Ferry delayed 2 h', simulate: '', workflows: ['vehicle', 'journey'] };
  const pend = { id: 30, kind: 'plan_draft', source_ref: 'run:r1:vehicle', text: JSON.stringify({ workflow: 'vehicle', lines: [] }) };
  const c = ctx('CD-420322', { case_timeline: [...open, ...stages, pend, { id: 31, kind: 'event', text: 'Ferry delayed 2 h' }] });
  const r = one('on_the_road_agent.json', 'Route', { Normalize: n, Classify: { codes: [], code_workflows: [] }, 'Get context': c, GLiDE: undefined }, c);
  const p = one('on_the_road_agent.json', 'Resume prep', { Normalize: n, 'Get context': c }, r);
  assert(p.glide_body.questions.vehicle.criteria.keep_plan && p.glide_body.state.events_since_close.some((e) => /Ferry delayed/.test(e)), 'GLiDE sees all events since the close and may keep waiting lines');
  const kept = one('on_the_road_agent.json', 'Resume', { Route: r, 'Resume prep': p, Normalize: n, 'Get context': c, 'GLiDE resume': { answers: { vehicle: { choice: 'keep_plan', confidence: 0.9 } } } }, null);
  assert(kept.items.map((x) => x.workflow).join() === 'journey' && /vehicle keeps its waiting plan lines/.test(kept.route_text), 'kept workflow is not run again');
  const solo = one('on_the_road_agent.json', 'Resume prep', { Normalize: { ...n, workflows: ['vehicle'] }, 'Get context': c }, { ...r, workflows: ['vehicle'] });
  assert(!solo.glide_body.questions.vehicle?.criteria.keep_plan, 'no keep when it is the only workflow');
}
const inc = resumeRun(undefined, 'event', ['incident']);
assert.equal(inc.out.safety_line, false, 'no 112 line on a wake-up');
{
  const n = { order_ref: 'CD-420537', run_id: 'r3', kind: 'event', source: 'driver', text: 'Driver says he was in an accident', simulate: '', workflows: [] };
  const sent = [{ id: 3, kind: 'driver_message', text: 'To driver: Bahn safety: if anyone is hurt or in danger, call 112 now' }];
  const safety = (timeline) => {
    const c = ctx('CD-420537', { case_timeline: timeline });
    const r = one('on_the_road_agent.json', 'Route', { Normalize: n, Classify: { codes: [], code_workflows: [] }, 'Get context': c, GLiDE: { answers: { incident: { noul: 0.9 } } } }, c);
    const p = one('on_the_road_agent.json', 'Resume prep', { Normalize: n, 'Get context': c }, r);
    return one('on_the_road_agent.json', 'Resume', { Route: r, 'Resume prep': p, Normalize: n, 'Get context': c }, null).safety_line;
  };
  assert.equal(safety([]), true, 'incident on a new event: automatic 112 line');
  assert.equal(safety(sent), false, '112 line only once per open case');
  const wf = JSON.parse(fs.readFileSync(path.join(here, 'workflows/on_the_road_agent.json'), 'utf8')).connections;
  assert(wf['Resume'].main[0].map((x) => x.node).join() === 'Safety line?' && wf['112 line'].main[0][0].node === 'Route rows', '112 line is sent before any workflow runs');
}

// ---------- router: coordinator (one plan per order) ----------
const draft = (id, run, wf, lines, extra = {}) => ({ id, kind: 'plan_draft', source_ref: `run:${run}:${wf}`, text: JSON.stringify({ workflow: wf, lines, customer_message: `${wf} buyer draft`, delivery_contact_message: '', rationale: `${wf} why`, evidence_refs: `alert-${id}`, ready_at: '', ...extra }) });
const coord = (runId, timeline) => one('on_the_road_agent.json', 'Coordinate', { Normalize: { order_ref: 'CD-420322', run_id: runId } }, { case_timeline: timeline });
const ev = (id, run) => ({ id, kind: 'event', source_ref: `run:${run}` });
const cA = coord('A', [ev(1, 'A'), draft(2, 'A', 'vehicle', [{ kind: 'staff_task', detail: 'x' }]), draft(3, 'A', 'tracking', [{ kind: 'notify_driver', detail: 'y' }])]);
assert(cA.file && cA.workflows.join() === 'vehicle,tracking' && JSON.parse(cA.lines).length === 2 && cA.evidence_refs === 'alert-2,alert-3', 'drafts of one run merge into one plan');
const newer = [ev(1, 'A'), ev(2, 'B'), draft(3, 'A', 'vehicle', [{ kind: 'staff_task', detail: 'x' }])];
assert(!coord('A', newer).file && /newer run/.test(coord('A', newer).note), 'older run leaves its drafts to a newer run still working');
assert(coord('A', [...newer, { id: 4, kind: 'coord', source_ref: 'run:B' }]).file, 'newer run already merged: the older run files the combined plan itself');
const after = [ev(1, 'A'), draft(2, 'A', 'documents', [{ kind: 'staff_task', detail: 'old' }]), { id: 3, kind: 'decision' }, ev(4, 'C'), draft(5, 'C', 'vehicle', [{ kind: 'staff_task', detail: 'new' }])];
assert.deepEqual(coord('C', after).workflows, ['vehicle'], 'drafts from before the last decision are not merged again');
const prior = [ev(1, 'A'), draft(2, 'A', 'documents', [{ kind: 'staff_task', detail: 'paper' }]), ev(4, 'C'), draft(5, 'C', 'vehicle', [{ kind: 'staff_task', detail: 'tow' }])];
assert.deepEqual(coord('C', prior).workflows, ['documents', 'vehicle'], 'a pending plan\'s drafts join the new combined plan');
assert(!coord('D', [...prior, ev(6, 'D')]).file, 'a run that drafted nothing files nothing');
const closed = [...open, { id: 9, kind: 'closed' }];
assert.equal(route('CD-420322', 'VEHICLE_WARNING', { timeline: closed }).items[0].session_id, 'case-CD-420322-vehicle-1', 'after close a new session starts');

// ---------- check_journey ----------
const cj = (ref, start = {}) => one('check_journey.json', 'Check journey', { Start: { order_ref: ref, from_time: '', km_left: '', ...start } }, ctx(ref));
const t806 = cj('CD-420806');
assert.equal(t806.tracking.normal, false, 'CD-420806: long silent gap is abnormal');
assert(t806.last_known_position?.near_city, 'last known position estimated');
const t437 = cj('CD-420437'); // road maths says 10:32Z, the driver app says 13:58Z: the slower one wins
assert.equal(t437.eta, '2026-10-21T13:58Z', 'later driver-app ETA beats the road estimate');
assert.equal(t437.verdict, 'at_risk', 'CD-420437 arrives 2 min before the window ends');
assert.equal(cj('CD-420437', { from_time: '2026-10-21T09:00Z' }).eta, '2026-10-21T10:32Z', 'a given restart time uses road maths only');
const reasons = rows.filter((r) => r.order_ref.startsWith('CD-')).map((r) => cj(r.order_ref).tracking?.why || '');
for (const re of [/before the pickup slot/, /min ago/]) assert(reasons.some((w) => re.test(w)), `some order shows normal gap reason ${re}`);
// No car is mid-crossing at snapshot time, so move the clock into CD-420603's sailing (departs 14:00Z).
const atSea = ctx('CD-420603'); atSea.snapshot.snapshot_now = '2026-10-21T18:00:00Z';
assert(/on the ferry/.test(one('check_journey.json', 'Check journey', { Start: { order_ref: 'CD-420603', from_time: '', km_left: '' } }, atSea).tracking.why), 'ferry crossing is a normal gap');
const atHotel = ctx('CD-420442'); atHotel.snapshot.snapshot_now = '2026-10-21T23:00:00Z'; // Stockholm hotel 19:00Z-05:00Z; dataset hotels are all pre-pickup, so pretend the car is on the road
atHotel.snapshot.order.status = 'IN_TRANSIT'; atHotel.snapshot.time_windows = atHotel.snapshot.time_windows.filter((w) => w.purpose !== 'SELECTED_PICKUP_SLOT');
assert(/planned hotel stop/.test(one('check_journey.json', 'Check journey', { Start: { order_ref: 'CD-420442', from_time: '', km_left: '' } }, atHotel).tracking.why), 'hotel stay is a normal gap');
// Road maths: 600 km = 8 h driving + one 45 min break; 900 km = 12 h + break + 11 h rest after 9 h.
const from = '2026-10-22T06:00:00Z', T0 = Date.parse(from);
assert.equal(Date.parse(cj('CD-420537', { from_time: from, km_left: '600' }).eta), T0 + 525 * 6e4, '600 km road ETA');
const far = cj('CD-420537', { from_time: from, km_left: '900' });
assert.equal(Date.parse(far.eta), T0 + 1425 * 6e4, '900 km road ETA includes 11 h rest');
const late = cj('CD-420537', { from_time: '2026-10-30T06:00:00Z', km_left: '900' });
assert.equal(late.verdict, 'late');
assert(Date.parse(late.suggested_new_window.start_at) >= Date.parse(late.eta), 'new window starts after arrival');

// ---------- plan_driver_travel ----------
const pdt = (ref, start) => one('plan_driver_travel.json', 'Plan travel', { Start: { order_ref: ref, purpose: '', from_city: '', to_city: '', earliest: '', ...start }, 'Get context': ctx(ref), Roster: roster }, null);
const rep = pdt('CD-420537', { purpose: 'replacement' });
assert(rep.ok && rep.candidates.length >= 1 && rep.candidates.length <= 3, 'replacement candidates');
const rosterRows = JSON.parse(roster.context).drivers;
const cur = ctx('CD-420537').snapshot.assignments.find((a) => a.status === 'IN_PROGRESS')?.driver_id;
assert(rep.candidates.every((c) => c.driver_id !== cur && !rosterRows.find((d) => d.id === c.driver_id).busy), 'only free drivers, never the current one');
assert(rep.candidates.every((c, k) => !k || Date.parse(c.arrives) >= Date.parse(rep.candidates[k - 1].arrives)), 'ranked by arrival');
assert.deepEqual(pdt('CD-420537', { purpose: 'replacement' }), rep, 'deterministic');
const hs = pdt('CD-420537', { purpose: 'positioning', from_city: 'Helsinki', to_city: 'Stockholm' });
assert(hs.ok && hs.options.every((o, k) => !k || Date.parse(o.arrives) > Date.parse(hs.options[k - 1].arrives) || (o.arrives === hs.options[k - 1].arrives && o.cost_cents >= hs.options[k - 1].cost_cents)), 'earliest arrival, then cost');
assert(hs.options.every((o) => o.mode === 'FLIGHT'), 'Finland to Sweden: no train');
const firstId = hs.recommended;
const again = one('plan_driver_travel.json', 'Plan travel', { Start: { order_ref: 'CD-420537', purpose: 'positioning', from_city: 'Helsinki', to_city: 'Stockholm', earliest: '' },
  'Get context': ctx('CD-420537', { plan_steps: [{ kind: 'book_flight', status: 'failed', ref: firstId }] }), Roster: roster }, null);
assert.notEqual(again.recommended, firstId, 'a flight that failed at booking is skipped');

// ---------- propose_plan ----------
const search = (ref, ready_at = '') => one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ref, ready_at } }, ctx(ref));
const pp = (ref, start, c = ctx(ref), r = search(ref)) => one('propose_plan.json', 'Build plan', { Start: { order_ref: ref, customer_message: '', rationale: 'test', evidence_refs: 'alert-1', ready_at: '', mode: 'main', ...start }, 'Get context': c }, r);
const ferryRef = 'CD-420299', rec = search(ferryRef).recommended;
// Ferry search (was test_rebooking.mjs): ranking, sold-out handling, determinism.
const fs0 = search(ferryRef);
assert(fs0.not_usable.some((x) => x.option_id === 'travel-xc1d8163d5443a606' && /sold out/.test(x.why_not)), 'dataset sold-out sailing excluded');
assert(fs0.options.every((x, k) => k === 0 || !(x.on_time && !fs0.options[k - 1].on_time)), 'on-time options rank first');
const fsB = one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ferryRef, ready_at: '' } }, ctx(ferryRef, { plan_steps: [{ kind: 'book_ferry', status: 'failed', note: 'sold out at booking time', ref: rec }] }));
assert.notEqual(fsB.recommended, rec, 're-plan skips the sailing that sold out at booking');
assert.deepEqual(search(ferryRef), fs0, 'deterministic');
// Settings: approval buffer and booking slack move the search; nothing departs before now + approval time.
const wide = ctx(ferryRef); wide.settings.approval_buffer_min = 24 * 60;
const fsW = one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ferryRef, ready_at: '' } }, wide);
assert(fsW.options.every((o) => Date.parse(o.at_terminal) >= Date.parse(wide.snapshot.snapshot_now) + 24 * 36e5), 'approval buffer delays every option');
const tight = ctx(ferryRef); tight.settings.booking_slack_min = 0;
const loose = ctx(ferryRef); loose.settings.booking_slack_min = 600;
const n0 = one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ferryRef, ready_at: '' } }, tight).options.length;
const n1 = one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ferryRef, ready_at: '' } }, loose).options.length;
assert(n1 <= n0 && fsW.assumptions.booking_slack_min === 60, 'more booking slack never adds options');
const slow = ctx('CD-420537'); slow.settings.road_speed_kmh = 50;
assert(Date.parse(one('check_journey.json', 'Check journey', { Start: { order_ref: 'CD-420537', from_time: '2026-10-22T06:00:00Z', km_left: '600' } }, slow).eta) > Date.parse('2026-10-22T06:00:00Z') + 525 * 6e4, 'road speed setting is used');
// Demo clock: dataset time + real time since start, times speed; empty start = frozen.
const clock = new Function(include('// @include settings.js') + '; return simNow;')();
assert.equal(clock('2026-10-21T09:00:00Z', { demo_clock_started_at: '' }, 5e6), Date.parse('2026-10-21T09:00:00Z'), 'no start = frozen');
assert.equal(clock('2026-10-21T09:00:00Z', { demo_clock_started_at: new Date(0).toISOString(), demo_clock_speed: 2 }, 6e4), Date.parse('2026-10-21T09:02:00Z'), '1 real min at 2x = 2 sim min');
// Ferry choices become fastest / cheapest / balanced options. All on time here: no buyer question, the employee picks.
const fp = pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: rec }]) });
assert(fp.ok, fp.error);
const fplan = JSON.parse(fp.payload);
assert(fplan.options.length >= 2 && fplan.options.every((o) => o.steps[0].kind === 'book_ferry'), 'ferry choices become options');
assert(fplan.options.flatMap((o) => o.names).sort().join() === 'balanced,cheapest,fastest', 'every pick named once; same option under two names merges');
assert.equal(fplan.recommended, fplan.options.find((o) => o.names.includes('balanced')).key, 'balanced is recommended');
assert(!fplan.needs_buyer && !fplan.valid_until && !fplan.steps.some((s) => s.kind === 'buyer_decision'), 'all on time: no buyer question');
assert(fplan.steps.some((s) => s.kind === 'notify_driver'), 'driver notice added by code');
const commonCents = fplan.steps.reduce((t, s) => t + s.cost_cents, 0);
assert(fplan.options.every((o) => o.total_cents === commonCents + o.steps.reduce((t, s) => t + s.cost_cents, 0)), 'option total = its lines + common lines');
assert.equal(fplan.total_cents, fplan.options.find((o) => o.key === fplan.recommended).total_cents, 'plan total = recommended option');
// Late ferry: the date changes, so the buyer chooses before a deadline; the delivery contact must confirm the new time.
const LATE = '2026-10-26T00:00Z', lateR = search(ferryRef, LATE);
const latePP = (start) => pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: lateR.recommended }]), ready_at: LATE, ...start }, ctx(ferryRef), lateR);
assert(/customer_message draft is required/.test(latePP({}).error), 'date change needs a buyer draft');
assert(/delivery_contact_message draft is required: .*Phoebe Fallowfield/.test(latePP({ customer_message: 'x' }).error), 'date change needs a delivery-contact draft');
const noConfirm = ctx(ferryRef); noConfirm.settings.confirm_with_delivery_contact = 'off';
assert(pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: lateR.recommended }]), ready_at: LATE, customer_message: 'x' }, noConfirm, lateR).ok, 'switch off: no delivery-contact draft needed');
const lp = latePP({ customer_message: 'Your car is delayed; pick an option.', delivery_contact_message: 'New arrival time follows.' });
assert(lp.ok, lp.error);
const lplan = JSON.parse(lp.payload);
const now0 = Date.parse(ctx(ferryRef).snapshot.snapshot_now);
assert(lplan.needs_buyer && lplan.steps.some((s) => s.kind === 'buyer_decision') && lplan.steps.some((s) => s.kind === 'delivery_contact_message'), 'buyer decides; delivery-contact draft kept');
assert(lplan.options.length === 0 && lplan.steps.some((s) => s.kind === 'change_delivery_window' && /buyer time .*Europe\//.test(s.detail)), 'one real choice (fastest = cheapest = balanced): no options, the late ferry still moves the window, buyer time shown');
assert(Date.parse(lplan.valid_until) <= now0 + settings.offer_valid_min * 6e4 && /\(Europe\//.test(lplan.valid_until_local), 'offer deadline within offer_valid_min, shown in buyer time');
// Modes: a workflow's draft is saved for the coordinator; preview builds without filing; recovery is never booked by the agent.
const st = pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: rec }]), run_id: 'abc:journey' });
assert(st.saved && st.row.kind === 'plan_draft' && st.row.source_ref === 'run:abc:journey' && JSON.parse(st.row.text).workflow === 'journey', 'run draft saved for the coordinator');
const pv = pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: lateR.recommended }]), ready_at: LATE, mode: 'preview' }, ctx(ferryRef), lateR);
assert(pv.ok && pv.preview && pv.plan.steps.some((s) => s.kind === 'change_delivery_window') && /Phoebe/.test(pv.delivery_contact.name) && pv.window_was, 'preview: full plan for the writer, no draft checks');
assert(/employee task/.test(pp(ferryRef, { lines: '[{"kind":"book_recovery","detail":"tow"}]' }).error), 'recovery is an employee task, not a booking');
assert(/do not add them again/.test(pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: rec }, { kind: 'approve_cost', amount_eur: 568.8, detail: 'ferry ticket plus hotels' }]) }).error), 'booking price is never added twice as a cost line');
assert(pp(ferryRef, { lines: '[{"kind":"approve_cost","amount_eur":240,"detail":"tow, price from employee task #12"}]' }).ok, 'a price from an employee task is accepted');
const ownQ = JSON.parse(pp(ferryRef, { lines: JSON.stringify([{ kind: 'book_ferry', option_id: rec }, { kind: 'buyer_decision', detail: 'car goes on the 22:00 sailing' }]) }).payload);
assert(ownQ.options.length && !ownQ.needs_buyer && !ownQ.steps.some((s) => s.kind === 'buyer_decision'), 'with options, code alone decides whether the buyer is asked');
const q = JSON.parse(pp(ferryRef, { lines: '[{"kind":"buyer_decision","detail":"How should the car be recovered?"}]', customer_message: 'How do you want it solved?' }).payload);
assert(!q.steps.some((s) => s.kind === 'notify_driver'), 'question-only plan holds no driver instruction');
const cx = JSON.parse(pp(ferryRef, { lines: '[{"kind":"cancel_delivery","detail":"driver injured, no replacement"}]', customer_message: 'We must cancel.' }).payload);
assert(cx.needs_buyer && cx.steps.some((s) => s.kind === 'cancel_delivery'), 'cancellation goes to the buyer');
assert(/not a usable ferry/.test(pp(ferryRef, { lines: '[{"kind":"book_ferry","option_id":"made-up"}]', customer_message: 'x' }).error), 'invented option refused');
assert(rep.candidates.every((c) => c.km_to_handover === 0 && !c.best_option), 'CD-420537: free drivers live in Hamburg, no travel needed');
assert(rep.candidates.every((c) => c.drive_used_min === 60 && c.can_start_driving), 'local handover counts 1 h of the replacement day');
const repG = pdt('CD-420537', { purpose: 'replacement', to_city: 'Graz' }); // nobody lives in Graz: replacement must travel
const best = repG.candidates.find((c) => c.best_option);
assert(best.drive_used_min > 0 && /pass drive_used_min/.test(best.hours_note), 'replacement trip counts against their working day');
const trainLine = { kind: `book_${best.best_option.mode.toLowerCase()}`, option_id: best.best_option.option_id, from_city: best.home_city, to_city: repG.handover_city, earliest: '', purpose: 'replacement', who: best.name };
const tpLines = [{ kind: 'staff_task', detail: 'Secure the car' }, { kind: 'reassign_driver', driver_id: best.driver_id, detail: 'takes over' }, trainLine, { kind: 'change_delivery_window', ...late.suggested_new_window }];
const tp = pp('CD-420537', { lines: JSON.stringify(tpLines), customer_message: 'Your delivery moves to a new window.', delivery_contact_message: 'New time follows.' });
assert(tp.ok, tp.error);
const tplan = JSON.parse(tp.payload);
const tSteps = tplan.options.length ? tplan.options.find((o) => o.key === tplan.recommended).steps.concat(tplan.steps) : tplan.steps;
assert(tSteps.some((s) => s.kind === trainLine.kind) && ['reassign_driver', 'notify_driver', 'customer_message', 'buyer_decision', 'staff_task'].every((k) => tplan.steps.some((s) => s.kind === k)), 'replacement plan: travel, handover, driver, buyer, staff');
const at = (k) => tplan.steps.findIndex((s) => s.kind === k);
assert(at('reassign_driver') < at('notify_driver') && at('notify_driver') < at('customer_message') && at('customer_message') < at('buyer_decision') && at('buyer_decision') < at('staff_task'), 'bookings first, people last; buyer answer step added');
const dr = pp('CD-420537', { lines: JSON.stringify([trainLine]), mode: 'sub', evidence_refs: '' });
assert(dr.ok && dr.draft && dr.lines.length === 1, 'draft mode returns lines, files nothing');
const pending = ctx('CD-420537', { case_proposals: [{ id: 7, status: 'pending', action: 'plan' }] });
assert(pp('CD-420537', { lines: JSON.stringify([{ kind: 'staff_task', detail: 'call the site' }]) }, pending).ok, 'a pending plan no longer blocks: the new one replaces it');
const exp = ctx('CD-420710').snapshot.expenses.find((e) => e.status === 'SUBMITTED');
assert.equal(exp.currency, 'DKK', 'CD-420710 claim is in DKK (dataset)');
const expPlan = JSON.parse(pp('CD-420710', { lines: JSON.stringify([{ kind: 'approve_cost', expense_id: exp.id }]) }).payload);
assert.equal(expPlan.total_cents, Math.round(exp.amount_cents / 7.46), 'DKK claim is converted to EUR');
assert(/DKK 315 = about EUR 42\.2/.test(expPlan.steps[0].detail), 'expense line names both currencies');
const chf = ctx('CD-420710'); chf.snapshot.expenses.find((e) => e.id === exp.id).currency = 'CHF';
assert(/no exchange rate for it, ask a person/.test(pp('CD-420710', { lines: JSON.stringify([{ kind: 'approve_cost', expense_id: exp.id }]) }, chf).error), 'currency not in the Settings list goes to a person');

// ---------- act executor ----------
const act = (plan, body = {}, { c = ctx('CD-420537'), status = 'pending', r = { ok: false }, rationale = '' } = {}) => one('act_proposal_decision.json', 'Re-check and execute (mock)', {
  'Decision webhook': { body: { decision: 'approve', operator: 'Test Op', ...body } },
  'Get proposal': { id: 11, order_ref: c.order_ref, action: 'plan', status, rationale, basis: JSON.stringify({ order_status: c.snapshot.order.status }), payload: JSON.stringify({ summary: 's', detail: JSON.stringify(plan) }) },
  'Current context': c, 'Current options': r }, r);
const kinds = (a, st) => a.steps.filter((s) => s.status === st).map((s) => s.kind).join();
// Date change: approve sends the offer to the buyer; nothing is booked and the driver keeps to the current plan.
assert(tplan.needs_buyer, 'replacement plan changes the date');
const o1 = act(tplan);
assert(o1.update.status === 'offered' && !o1.wake && o1.case.owner === 'buyer', 'approve = offer to the buyer, agent not woken');
assert(kinds(o1, 'done') === 'customer_message,notify_driver' && kinds(o1, 'waiting_for_person') === 'buyer_decision' && /Keep to your current plan/.test(o1.steps[1].detail), 'offer sent, driver told to keep the plan, buyer step waits');
const offered = JSON.parse(JSON.parse(o1.update.payload).detail);
assert(offered.valid_until && offered.offered_by === 'Test Op', 'offer deadline stored with the plan');
// Buyer accepts: final check, then bookings, the delivery contact and the driver; no second buyer message.
const b1 = act(offered, { decision: 'buyer_accept', note: 'ok' }, { status: 'offered' });
assert.equal(b1.update.status, 'executed', b1.update.result);
assert(b1.steps[0].kind === trainLine.kind && b1.steps[0].status === 'done' && b1.steps[0].step_no === '1', 'train booked after the buyer said yes');
assert(!b1.steps.some((s) => ['customer_message', 'buyer_decision'].includes(s.kind)) && b1.close_buyer === `accepted option ${tplan.recommended}: ok` && kinds(b1, 'done').includes('delivery_contact_message'), 'buyer step closed, no repeat message, delivery contact told now');
assert(kinds(b1, 'waiting_for_person') === 'staff_task' && !b1.wake, 'staff task still waits; agent not woken yet');
assert(/booking refs: MOCK-TRAIN/.test(b1.steps.find((s) => s.kind === 'notify_driver').detail), 'driver instruction carries the booking ref');
assert(!/the option the buyer chooses/.test(b1.steps.find((s) => s.kind === 'notify_driver').detail), 'driver is told the chosen option, not the placeholder');
// A check before booking: first in the plan, open at once, blocks approval until done, not repeated when booking.
const gp = JSON.parse(pp('CD-420537', { lines: JSON.stringify([...tpLines, { kind: 'staff_task', detail: 'Cancel the old ferry booking first', before_booking: true }]), customer_message: 'Your delivery moves to a new window.', delivery_contact_message: 'New time follows.' }).payload);
assert(gp.steps[0].before_booking && gp.steps[0].kind === 'staff_task', 'check before booking comes first');
const gRows = run('propose_action.json', 'Offer note', { 'Insert proposal': { id: 21, order_ref: 'CD-420537', payload: JSON.stringify({ detail: JSON.stringify(gp) }) }, 'Mark offered replaced': [] });
assert(gRows.length === 1 && gRows[0].ref === 'before_booking' && gRows[0].status === 'waiting_for_person', 'check opens as a step when the plan is filed');
const gStep = (status) => ctx('CD-420537', { plan_steps: [{ id: 99, proposal_id: '11', ref: 'before_booking', status, kind: 'staff_task', detail: 'Cancel the old ferry booking first' }] });
const gBlocked = act(gp, {}, { c: gStep('waiting_for_person') });
assert(!gBlocked.ok && /Do the check first \(step #99/.test(gBlocked.error), 'approve refused while the check is open');
const gOffer = act(gp, {}, { c: gStep('done') });
assert.equal(gOffer.update.status, 'offered', 'check done: plan can be offered');
const gDone = act(JSON.parse(JSON.parse(gOffer.update.payload).detail), { decision: 'buyer_accept', note: 'ok' }, { status: 'offered', c: gStep('done') });
const gCase = one('plan_step.json', 'Case row', { 'Check step': { order_ref: 'CD-420537', proposal_id: '11', update: { status: 'done' } }, 'Plan steps': [], 'Get step': { ref: 'before_booking' } });
assert(gCase.owner === 'operator' && /can now be approved/.test(gCase.summary), 'done check: the plan still waits for approval');
assert(gDone.update.status === 'executed' && gDone.steps.filter((s) => s.kind === 'staff_task').length === 1, 'the done check is not opened again when booking');
const lateAns = act({ ...offered, valid_until: '2026-10-21T08:00:00.000Z' }, { decision: 'buyer_accept' }, { status: 'offered' });
assert(lateAns.update.status === 'expired' && lateAns.wake && /expired/.test(lateAns.wake_event) && !lateAns.steps.length, 'answer after the deadline: nothing booked, re-plan');
const sold = act(offered, { decision: 'buyer_accept', simulate: `${trainLine.kind.slice(5)}_sold_out` }, { status: 'offered' });
assert(sold.update.status === 'failed' && sold.steps.slice(1).every((s) => s.status === 'skipped') && /Re-plan only what failed/.test(sold.wake_event), 'failed transport stops the rest and wakes the agent');
const dec = act(offered, { decision: 'buyer_decline', note: 'too late for us' }, { status: 'offered', rationale: 'incident: driver ill | journey: late' });
assert(dec.update.status === 'declined' && dec.wake && /too late for us/.test(dec.wake_event) && dec.workflows === 'incident,journey' && /declined/.test(dec.close_buyer), 'decline wakes the same workflows with the reason');
const qPlan = JSON.parse(pp(ferryRef, { lines: '[{"kind":"buyer_decision","detail":"How should the car be recovered?"},{"kind":"staff_task","detail":"x"}]', customer_message: 'How?' }).payload);
const qa = act(qPlan, { decision: 'buyer_accept', note: 'own roadside assistance' }, { c: ctx(ferryRef), status: 'offered' });
assert(qa.wake && /own roadside assistance/.test(qa.wake_event), "buyer's answer to a question wakes the agent");
// Reject needs a reason and wakes exactly the workflows that made the plan.
assert(/why you reject/.test(act(tplan, { decision: 'reject' }).error), 'reject needs a reason');
const rj = act(tplan, { decision: 'reject', note: 'use a flight, the train is too slow' }, { rationale: 'incident: x | bogus: y' });
assert(rj.update.status === 'rejected' && rj.wake && /avoids this reason/.test(rj.wake_event) && rj.workflows === 'incident', 'reject wakes the planner with the reason');
assert(/is offered; 'approve' needs a pending plan/.test(act(tplan, {}, { status: 'offered' }).error), 'wrong state refused');
// On-time ferry plan: the employee books now (recommended option, or the one they pick) or asks the buyer first.
const fr = search(ferryRef), fctx = ctx(ferryRef);
const bn = act(fplan, {}, { c: fctx, r: fr });
const recFerry = fplan.options.find((o) => o.key === fplan.recommended).steps.find((s) => s.kind === 'book_ferry');
assert(bn.update.status === 'executed' && bn.steps[0].kind === 'book_ferry' && bn.steps[0].status === 'done' && bn.steps[0].detail === recFerry.detail, 'book now: recommended option booked');
const lateFr = { ...fr, options: fr.options.map((o) => ({ ...o, on_time: false, late_hours: 5 })) };
const lt = act(fplan, {}, { c: fctx, r: lateFr });
assert(lt.update.status === 'failed' && /no longer arrives on time/.test(lt.update.result) && lt.wake, 'final check: a sailing that is now late is not booked');
const other = fplan.options.find((o) => o.key !== fplan.recommended);
assert.equal(act(fplan, { option: other.key }, { c: fctx, r: fr }).steps[0].detail, other.steps.find((s) => s.kind === 'book_ferry').detail, 'employee picks another option');
assert(/option must be one of/.test(act(fplan, { option: 'Z' }, { c: fctx, r: fr }).error), 'unknown option refused');
const ask = act(fplan, { send: 'ask_buyer' }, { c: fctx, r: fr });
assert(ask.update.status === 'offered' && Date.parse(JSON.parse(JSON.parse(ask.update.payload).detail).valid_until) === Date.parse(fctx.snapshot.snapshot_now) + settings.offer_valid_min * 6e4, 'ask buyer first: offer valid for offer_valid_min');
const pricey = { ...fr, options: fr.options.map((o) => ({ ...o, ticket_cents: o.ticket_cents + 500 })) };
const st2 = act(fplan, {}, { c: fctx, r: pricey });
assert(st2.update.status === 'failed' && /price changed/.test(st2.update.result) && st2.wake && !st2.steps.length, 'price changed at the final check: nothing booked, re-plan');
const a3 = act({ steps: [recFerry], total_cents: recFerry.cost_cents }, {}, { c: fctx, r: fr });
assert(a3.wake && /Do the next stage/.test(a3.wake_event), 'nothing left for a person: agent is woken');

// ---------- create_employee_task (was escalate_urgent) ----------
const silentTl = [{ id: 1, kind: 'driver_message', text: 'To driver: where are you?' }, { id: 2, kind: 'driver_message', text: '(no reply)' }];
const esc = (start, journey = { tracking: { normal: false, stopped: false } }, timeline = silentTl) => one('escalate_urgent.json', 'Check', {
  Start: { order_ref: 'CD-420537', reason: '', last_known_location: 'near Hamburg', task: '', priority: 'urgent', info: '', workflow: 'tracking', ...start },
  'Get context': ctx('CD-420537', { case_timeline: timeline }) }, journey);
assert(!esc({ reason: 'driver silent' }).ok, 'task required');
const e1 = esc({ reason: 'driver silent', task: 'Call the driver now' });
assert(e1.ok && e1.priority === 'urgent' && e1.case_row.status === 'urgent' && e1.step_row.proposal_id === 'task' && /\[workflow tracking\]/.test(e1.step_row.note), 'silent driver + tracking off = urgent');
const e2 = esc({ reason: 'driver silent', task: 'Call the driver now' }, { tracking: { normal: true, stopped: false } });
assert(e2.priority === 'top' && /tracking looks normal/.test(e2.downgraded) && e2.case_row.status === 'needs_decision', 'tracking fine and moving: lowered to top');
assert.equal(esc({ reason: 'x', task: 'y' }, { tracking: { normal: true, stopped: true } }).priority, 'urgent', 'car stopped counts like tracking off');
assert(/driver is answering/.test(esc({ reason: 'x', task: 'y' }, undefined, [{ id: 1, kind: 'driver_message', text: 'Reply: all fine' }]).downgraded), 'driver answering: never urgent');
const e3 = esc({ reason: 'recovery price needed', task: 'Get the tow price', priority: 'normal', info: 'buyer chose Bahn tow' });
assert(e3.priority === 'normal' && e3.case_row.status === 'waiting_on_person' && /Info: buyer chose Bahn tow/.test(e3.step_row.detail), 'normal task with info');
const dupTask = ctx('CD-420537', { plan_steps: [{ id: 4, proposal_id: 'task', status: 'waiting_for_person', detail: 'Call the driver now (last known location: near Hamburg)' }] });
assert(/already open/.test(one('escalate_urgent.json', 'Check', { Start: { order_ref: 'CD-420537', reason: 'r', task: 'Call the driver now', priority: 'top' }, 'Get context': dupTask }, {}).error), 'same open task is not created twice');

// ---------- shared plan rules (lib/plan.js) ----------
const P = new Function(include('// @include plan.js') + '; return { STAGES, pickOptions, validUntil, mergeDrafts, urgentAllowed, driverSilent, localTime };')();
const picks = P.pickOptions([{ id: 'a', arrive_ms: 1, cost_cents: 900, late_h: 0 }, { id: 'b', arrive_ms: 5, cost_cents: 100, late_h: 10 }, { id: 'c', arrive_ms: 3, cost_cents: 300, late_h: 0.1 }], 25);
assert.deepEqual(picks.map((x) => [x.id, x.names.join('/')]), [['a', 'fastest'], ['b', 'cheapest'], ['c', 'balanced']], 'fastest, cheapest, balanced (cost + late hours x EUR)');
assert.deepEqual(P.pickOptions([{ id: 'a', arrive_ms: 1, cost_cents: 1, late_h: 0 }], 25)[0].names, ['fastest', 'cheapest', 'balanced'], 'one option under three names');
assert.equal(P.validUntil(0, 120, [3600e3, NaN]), 3600e3, 'deadline = earliest latest-bookable time');
assert.equal(P.validUntil(0, 120, []), 120 * 6e4, 'deadline = now + offer time');
const md = P.mergeDrafts([
  { workflow: 'journey', lines: [{ kind: 'book_ferry', option_id: 'f1' }, { kind: 'change_delivery_window', start_at: '2026-10-22T10:00Z', end_at: '2026-10-22T12:00Z' }], customer_message: 'j', rationale: 'r1', evidence_refs: 'a', ready_at: '2026-10-22T08:00Z' },
  { workflow: 'vehicle', lines: [{ kind: 'book_ferry', option_id: 'f2' }, { kind: 'change_delivery_window', start_at: '2026-10-23T10:00Z', end_at: '2026-10-23T12:00Z' }, { kind: 'staff_task', detail: 'tow' }], customer_message: 'v', delivery_contact_message: 'c', rationale: 'r2', evidence_refs: 'b', ready_at: '2026-10-23T08:00Z' }]);
assert.deepEqual(md.lines.map((l) => l.kind), ['book_ferry', 'change_delivery_window', 'staff_task'], 'one ferry, one window, others kept');
assert.equal(md.lines[1].end_at, '2026-10-23T12:00Z', 'the latest new window wins');
assert(md.customer.length === 2 && md.contact.length === 1 && md.rationale[1] === 'vehicle: r2' && md.ready_at === '2026-10-23T08:00Z', 'drafts collected for the writer');
assert(P.driverSilent(silentTl) && !P.driverSilent([]) && !P.driverSilent([{ kind: 'driver_message', text: 'Reply: ok' }]), 'driver silent = last question unanswered');
assert(P.urgentAllowed({ driverSilent: true, trackingNormal: false }) && !P.urgentAllowed({ driverSilent: true, trackingNormal: true, stopped: false }) && !P.urgentAllowed({ driverSilent: false, trackingNormal: false }), 'urgent rule');
assert(/^Wed 21 Oct, 12:00 \(Europe\/Helsinki\)$/.test(P.localTime(Date.parse('2026-10-21T09:00Z'), 'Europe/Helsinki')), 'buyer local time');
assert(Object.keys(P.STAGES).length === 8 && P.STAGES.vehicle.solution_question, 'stages for all 8 workflows');

// ---------- log_stage + check_journey extras ----------
const ls = (start) => one('log_stage.json', 'Check', {}, { order_ref: 'cd-420322', workflow: 'vehicle', stage: 'safety', result: 'driver safe', ...start });
assert(ls().ok && ls().row.source_ref === 'stage:vehicle:safety' && ls().row.order_ref === 'CD-420322', 'stage row');
assert(/stage must be one of/.test(ls({ stage: 'booking' }).error), 'unknown stage refused');
const stopCtx = ctx('CD-420806'); const tr = stopCtx.snapshot.tracking_latest;
tr.push({ ...tr.at(-1), observed_at: new Date(Date.parse(tr.at(-1).observed_at) + 40 * 6e4).toISOString() });
assert.equal(one('check_journey.json', 'Check journey', { Start: { order_ref: 'CD-420806', from_time: '', km_left: '' } }, stopCtx).tracking.stopped, true, 'no progress over 30+ min = car stopped');
assert(Date.parse(cj('CD-420537', { from_time: from, km_left: '600', drive_used_min: '480' }).eta) > T0 + 525 * 6e4, 'hours already worked push the rest earlier');

// ---------- route plan from the dataset ----------
const rp = ctx('CD-420299').snapshot.route_plan;
assert(rp && rp.status === 'ACTIVE' && rp.legs[0].mode === 'DRIVE_WITH_FERRY' && rp.stops.map((x) => x.city).join() === 'Leipzig,Helsinki', 'order route plan in the snapshot');
const noTrack = cj('CD-420299');
assert(/from route plan/.test(noTrack.eta_basis) && noTrack.road?.km_left === 1780, 'no tracking yet: distance from the route plan');

// ---------- check_note ----------
const cnStart = { note: 'no', purpose: 'reason for rejecting a plan', context: 'ferry plan', skip: 'false' };
assert.equal(one('check_note.json', 'Prep', { Start: { ...cnStart, skip: 'true' } }, {}).check, false, 'skip: no check');
assert.equal(one('check_note.json', 'Prep', { Start: cnStart }, { value: '0.7' }).threshold, 0.7, 'threshold from Settings');
const judge = (noul) => one('check_note.json', 'Judge', { Prep: { threshold: 0.6 }, Start: cnStart }, { answers: { clear: { noul } } });
assert(judge(0.9).ok && !judge(0.2).ok && /too vague/.test(judge(0.2).prompt), 'vague note gets a question prompt');
assert(one('check_note.json', 'Judge', { Prep: { threshold: 0.6 }, Start: cnStart }, { error: { message: 'down' } }).ok, 'GLiDE down: note passes unchecked');

// ---------- Telegram inbound: what a reply means ----------
const offerSent = { order_ref: 'CD-420299', role: 'buyer', proposal_id: '6', text: 'offer', buttons: JSON.stringify([{ key: 'A', label: 'A: fastest' }, { key: 'B', label: 'B: cheapest' }, { key: 'decline', label: 'None of these' }]) };
const tgSet = [{ key: 'glide_buyer_reply', value: '0.6' }];
// Link runs first (reply, button, the sender's only open order, or "which order"), then Decide.
const tgDec = (body, sent = offerSent, { history = [], cases = [], outs = [] } = {}) => {
  const nodes = { 'Inbound webhook': { body }, 'Sent message': sent, 'Sender history': history, Cases: cases, Settings: tgSet };
  return one('tg_inbound.json', 'Decide', { ...nodes, Link: one('tg_inbound.json', 'Link', nodes, {}), 'Latest out': outs }, {});
};
assert.deepEqual([tgDec({ data: 'a:6:B', text: '' }).decision, tgDec({ data: 'a:6:B' }).option], ['buyer_accept', 'B'], 'button tap accepts that option');
assert.equal(tgDec({ data: 'a:6:decline' }).decision, 'buyer_decline', 'None of these declines');
assert.equal(tgDec({ text: 'We take option b please' }).option, 'B', 'typed option letter');
assert.equal(tgDec({ text: 'A' }).option, 'A', 'bare letter');
assert.equal(tgDec({ text: 'a car is fine I guess?' }).action, 'glide', 'an article is not an option: GLiDE reads it');
assert.equal(tgDec({ text: 'hello' }, {}).action, 'unknown', 'no linked order: staff is asked');
assert.equal(tgDec({ text: 'stuck' }, { ...offerSent, role: 'driver' }).action, 'router', 'driver message wakes the agent');
const hist = (...refs) => refs.map(([order_ref, role], k) => ({ id: k + 1, order_ref, role, direction: 'in', chat_id: '77' }));
const only = tgDec({ text: 'running late, 30 min', from_id: '77' }, {}, { history: hist(['CD-420299', 'driver']) });
assert(only.action === 'router' && only.order_ref === 'CD-420299' && only.linked === 'only open order', 'free text: the sender\'s only open order');
const which = tgDec({ text: 'hello?', from_id: '77' }, {}, { history: hist(['CD-420299', 'driver'], ['CD-420537', 'buyer']) });
assert(which.action === 'which' && which.choices.length === 2, 'several open orders: the bot asks which');
assert.equal(tgDec({ text: 'hi', from_id: '77' }, {}, { history: hist(['CD-420299', 'driver'], ['CD-420537', 'buyer']), cases: [{ id: 1, order_ref: 'CD-420537', status: 'closed_by_agent' }] }).order_ref, 'CD-420299', 'closed orders do not count as open');
const chosen = tgDec({ data: 'o:CD-420537:buyer', reply_to_tg_id: '9' }, { text: 'Can you deliver Friday instead?', kind: 'which_order', role: 'unknown', order_ref: '' });
assert(chosen.order_ref === 'CD-420537' && chosen.role === 'buyer' && chosen.text === 'Can you deliver Friday instead?' && chosen.action !== 'act', 'which-order tap: original text goes to the chosen order');
const reo = tgDec({ text: 'The car has a scratch we did not see before' }, offerSent, { cases: [{ id: 1, order_ref: offerSent.order_ref, status: 'closed_by_agent' }] });
assert(reo.reopen && reo.glide_body.questions.new_issue, 'closed case: GLiDE checks for a new issue');
const jr = (v) => one('tg_inbound.json', 'Judge', { Decide: reo }, { answers: { new_issue: { noul: v } } });
assert(jr(0.9).action === 'router' && jr(0.1).action === 'log', 'new issue reopens; thanks is only logged');
const mt = one('tg_inbound.json', 'Media text', { 'Inbound webhook': { body: { text: 'look', media: { kind: 'voice', file_id: 'F1' } } } }, { choices: [{ message: { content: '{"language":"German","transcript":"Motor leuchtet","english":"Engine light is on","description":""}' } }] });
assert.equal(mt.body.text, 'look\n[voice message, German: "Motor leuchtet" (English: "Engine light is on")]\n[media voice F1]', 'voice: transcript, language and English in the text');
assert(/could not be read automatically/.test(one('tg_inbound.json', 'Media text', { 'Inbound webhook': { body: { media: { kind: 'photo', file_id: 'F2' } } } }, { error: 'x' }).body.text), 'model down: staff open the file');
const jd = (ans, d = tgDec({ text: 'hmm' })) => one('tg_inbound.json', 'Judge', { Decide: d }, ans);
assert.equal(jd({ answers: { accept: { noul: 0.2 }, decline: { noul: 0.9 } } }).decision, 'buyer_decline', 'clear decline');
assert.equal(jd({ answers: { accept: { noul: 0.9 }, decline: { noul: 0.1 } } }).action, 'task', 'accept without a choice among 2 options: a person asks which');
assert.equal(jd({ error: { message: 'down' } }).action, 'task', 'GLiDE down: a person reads it');
assert.equal(jd({ answers: { accept: { noul: 0.9 } } }, tgDec({ text: 'ok fine' }, { ...offerSent, role: 'delivery_contact', buttons: '[]' })).action, 'log', 'delivery contact confirms');

// ---------- reminders ----------
const ago = (min) => new Date(Date.now() - min * 6e4).toISOString();
const remSet = [{ key: 'demo_clock_started_at', value: ago(600) }, { key: 'reminder_count', value: '2' }];
const offerP = (until, status = 'offered') => ({ id: 9, order_ref: 'CD-420299', status, rationale: 'journey: x', payload: JSON.stringify({ detail: JSON.stringify({ valid_until: until, valid_until_local: 'soon', options: [{ key: 'A', names: ['fastest'], total_eur: 'EUR 1', arrives_local: 'x' }] }) }) });
const bw = (extra = {}) => ({ id: 1, order_ref: 'CD-420299', who: 'buyer', person_key: 'buyer:CD-420299', about: 'customer_message', ref: '9', since: ago(40), reminders: '0', state: 'open', last_reminded: '', ...extra });
const btnMsg = { id: 5, proposal_id: '9', direction: 'out', buttons: '[{\"key\":\"A\"}]', tg_message_id: '42' };
const rem = (w, p, msgs = [btnMsg], steps = []) => run('otr_reminders.json', 'Decide', { Settings: remSet, Waits: w, Proposals: p, Steps: steps, Messages: msgs }, {});
const types = (r) => r.map((x) => x.type).sort().join(',');
assert.equal(types(rem([bw()], [offerP('2026-10-21T09:00:00Z')])), 'proposal_update,tg,unbutton,wait_update,wake', 'offer past deadline: expired, buttons removed, agent woken, staff told');
assert(rem([bw()], [offerP('2026-10-21T09:00:00Z')], [btnMsg], [{ id: 32, proposal_id: '9', step_no: 'R1', status: 'waiting_for_person', kind: 'customer_message' }]).some((x) => x.type === 'step_update' && x.id === 32), 'offer ended: its unsent reminder draft is skipped');
const r1 = rem([bw()], [offerP('2027-01-01T00:00:00Z')]);
assert(r1.some((x) => x.type === 'step' && x.row.kind === 'customer_message' && x.row.status === 'waiting_for_person'), 'buyer silent: reminder draft waits for approval');
assert.equal(types(rem([bw({ reminders: '2' })], [offerP('2027-01-01T00:00:00Z')])), 'task,wait_update', 'after 2 reminders: employee task');
assert.equal(types(rem([bw({ since: ago(5) })], [offerP('2027-01-01T00:00:00Z')])), '', 'not yet due: nothing');
assert.equal(types(rem([bw()], [offerP('2027-01-01T00:00:00Z', 'executed')])), 'unbutton,wait_update', 'decided plan: wait closed and buttons removed');
const dw = bw({ who: 'driver', person_key: 'driver:CD-420299', about: 'driver_message', ref: '', since: ago(20) });
assert(rem([dw], []).some((x) => x.type === 'tg' && x.role === 'driver'), 'driver silent: automatic reminder');
assert.equal(types(rem([dw], [], [{ id: 7, direction: 'in', person_key: 'driver:CD-420299', createdAt: ago(1) }])), 'wait_update', 'driver answered: wait closed');
assert.equal(rem([{ ...dw, reminders: '2' }], []).find((x) => x.type === 'task').priority, 'urgent', 'driver silent after reminders: urgent request (the task rule may lower it)');
const pend = { ...offerP(''), id: 3, status: 'pending' };
assert(rem([], [pend]).some((x) => x.type === 'wait_insert' && x.row.ref === 'proposal:3'), 'pending plan: employee wait opened');
assert(rem([{ ...bw(), who: 'employee', person_key: 'employee', ref: 'proposal:3', since: ago(20) }], [pend]).some((x) => x.type === 'tg' && x.role === 'staff' && /Reminder 1/.test(x.text)), 'employee silent: staff ping');
assert(!rem([{ ...bw(), who: 'employee', person_key: 'employee', ref: 'proposal:3', since: ago(20) }], [pend]).some((x) => x.type === 'step'), 'employee silent: no customer draft (was a loop)');
assert(!rem([{ ...bw(), who: 'employee', person_key: 'employee', ref: 'proposal:3', state: 'escalated' }], [pend]).some((x) => x.type === 'wait_insert'), 'escalated employee wait is not reopened');
assert(/ESCALATED to Shift lead/.test(rem([{ ...bw(), who: 'employee', person_key: 'employee', ref: 'proposal:3', reminders: '2', since: ago(60) }], [pend]).find((x) => x.type === 'tg').text), 'then escalated to the shift lead');


// ---------- asked times: ready / handover, check-ins, arrival wait ----------
const askStep = (note, body) => one('plan_step.json', 'Check step', { 'Step webhook': { body: { step_id: 5, operator: 'ops', outcome: 'done', ...body } }, 'Get step': { id: 5, order_ref: 'CD-420299', proposal_id: 'task', kind: 'staff_task', status: 'waiting_for_person', note, detail: 'x', attempts: '0' }, Settings: [{ key: 'repair_slack_min', value: '60' }] }, {});
const rd = askStep('normal: x [workflow vehicle] [ask_time ready]', { time: '2026-10-21T14:00:00Z', note: 'tow EUR 300' });
assert(/Car ready at: 2026-10-21T14:00Z \(plan from 2026-10-21T15:00Z: 60 min safety margin/.test(rd.update.note) && /\[ask_time ready at 2026-10-21T14:00Z\]/.test(rd.update.note), 'ready time gets the repair margin and stays tagged');
assert(/not known yet.*\[ask_time handover unknown\]/.test(askStep('x [ask_time handover]', {}).update.note), 'handover time not known');
assert.equal(askStep('x [ask_time ready]', { time: 'soon' }).ok, false, 'a time must be a date-time');
const askRow = (note, status = 'done', id = 50) => ({ id, order_ref: 'CD-420299', proposal_id: 'task', kind: 'staff_task', status, note: note + ' [workflow incident]' });
assert(rem([], [], [], [askRow('[ask_time handover unknown]')]).some((x) => x.type === 'wait_insert' && x.row.ref === 'checkin:CD-420299'), 'unknown time: check-in wait opened');
const ciW = { id: 8, order_ref: 'CD-420299', who: 'employee', person_key: 'employee', ref: 'checkin:CD-420299', since: ago(40), reminders: '0', state: 'open', last_reminded: '' };
const ci = rem([ciW], [], [], [askRow('[ask_time handover unknown]')]);
assert(ci.some((x) => x.type === 'task' && x.ask_time === 'handover') && ci.some((x) => x.type === 'wake' && /Check-in/.test(x.event) && x.workflows === 'incident'), 'check-in: staff asked again, agent re-checks');
assert(!rem([ciW], [], [], [askRow('[ask_time handover unknown]'), askRow('[ask_time handover]', 'waiting_for_person', 51)]).some((x) => x.type === 'task'), 'check-in: no second task while one is open');
assert(rem([ciW], [], [], [askRow('[ask_time handover at 2026-10-21T15:00Z]', 'done', 52)]).some((x) => x.type === 'wait_update' && x.id === 8 && x.fields.state === 'answered'), 'time given: check-ins stop');
assert(rem([], [], [], [askRow('[ask_time handover at 2026-10-21T15:00Z]', 'done', 52)]).some((x) => x.type === 'wait_insert' && x.row.who === 'driver' && x.row.ref === 'arrival:52'), 'known handover time: driver confirms arrival');
// Sold-out report on the current sailing: it is not offered again.
const soldCtx = ctx(ferryRef, { case_timeline: [{ id: 3, kind: 'event', text: `Alert: ${rec} sold out` }] });
const fsS = one('plan_rebooking.json', 'Search and score', { Start: { order_ref: ferryRef, ready_at: '' } }, soldCtx);
assert(fsS.recommended !== rec && fsS.not_usable.some((x) => x.option_id === rec && /per alert/.test(x.why_not)), 'a sold-out report removes the named sailing');

// ---------- tg_send: customer language ----------
const deCtx = { context: JSON.stringify({ customer: { name: 'Autohaus X', language: 'de' } }) };
const langOf = (on, role = 'buyer', extra = {}) => one('tg_send.json', 'Language', { Settings: [{ key: 'reply_in_customer_language', value: on }], Context: deCtx, Start: { role, text: 'Option A arrives 31 Oct.', from_sim: 'false', ...extra } }, {});
assert(langOf('on').need && langOf('on').language === 'German' && /German/.test(langOf('on').prompt), 'German buyer, switch on: translate');
assert(!langOf('off').need, 'switch off: English only');
assert(!langOf('on', 'driver').need && !langOf('on', 'staff').need, 'driver and staff stay English');
assert(!langOf('on', 'buyer', { from_sim: 'true' }).need, 'simulated reply is not translated');
const prepTr = (said) => one('tg_send.json', 'Prep', { Context: deCtx, Start: { role: 'buyer', order_ref: 'CD-1', text: 'Option A arrives 31 Oct.', buttons: '[]' }, Language: { need: true, code: 'de' }, Translate: said === undefined ? undefined : { text: said } }, {});
assert(/^To buyer Autohaus X \(CD-1\):\nOption A kommt am 31 Oct\.\n\n\(English: Option A arrives 31 Oct\.\)$/.test(prepTr('Option A kommt am 31 Oct.').body.text), 'translation first, English below');
assert(prepTr(undefined).body.text.endsWith('\nOption A arrives 31 Oct.') && prepTr(undefined).language === 'en', 'translation failed: English only');
// Buyer drafts: a time or price that is not in the plan facts is flagged for staff.
{
  const merged = { customer: ['draft'], contact: [], lines: [] };
  const prompt = 'PLAN (checked by code): ferry arrives 14:30, check-in by 2026-10-22T10:00Z, total EUR 1,240.50\nDrafts from the workflows (merge them): buyer: arrives 09:00 EUR 50';
  const wr = (text) => one('on_the_road_agent.json', 'Writer result', { Coordinate: { merged }, 'Writer prompt': { prompt, need: { buyer: true, contact: false } } }, { text });
  assert.deepEqual(wr(JSON.stringify({ customer_message: 'Arrives 14:30, total EUR 1240.50.', driver_note: 'Check in by 10:00 UTC.' })).code_problems, [], 'facts match, also a time written inside an ISO timestamp');
  assert.deepEqual(wr(JSON.stringify({ customer_message: 'Arrives 9:00, total 50 EUR.' })).code_problems, ['time 9:00', 'amount 50 EUR'], 'time and amount only in a draft are flagged');
  const gb = wr(JSON.stringify({ customer_message: 'Arrives 14:30.' })).glide_body.state;
  assert(gb.messages.includes('To buyer: Arrives 14:30.') && gb.facts.startsWith('PLAN (checked by code)'), 'GLiDE gets the messages as text and only the facts');
  const ck = (noul) => one('on_the_road_agent.json', 'Checked', { 'Writer result': wr('{}'), 'Context after': { settings: { glide_grounding: 0.5 } } }, { answers: { grounded: { noul } } }).fact_note;
  assert(/GLiDE 0.20/.test(ck(0.2)) && ck(0.9) === '', 'GLiDE fact check below the threshold warns staff');
}
console.log('ok: router (keep waiting lines, fact check) (routing, resume, 112 line, coordinator), check_journey, plan_driver_travel, propose_plan, act (offer, buyer answer, reject), check_note, telegram inbound (linking, which order, reopen, media), reminders, asked times and check-ins, sold-out reports, customer language, create_employee_task, plan rules, log_stage');
console.log('  replacement:', best.name, 'from', best.home_city, '->', repG.handover_city, best.best_option.mode, best.best_option.arrives, 'EUR', best.best_option.cost_eur);
console.log('  late estimate:', late.eta, 'new window', late.suggested_new_window.start_at, '->', late.suggested_new_window.end_at);
