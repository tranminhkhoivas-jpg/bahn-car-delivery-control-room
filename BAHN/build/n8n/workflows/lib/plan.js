// Shared plan rules (pasted into Code nodes by "// @include plan.js"; tested in test_workflows.mjs).
// Stages each problem workflow walks through, in order. A re-plan resumes at one of these (GLiDE picks which).
const STAGES = {
  journey: { check: 'check the road estimate or ferry timing', options: 'search ferry, hotel or new window options', plan: 'file the plan' },
  vehicle: { safety: 'driver safe and stopped safely', facts_photo: 'location, dashboard photo, can the car move', solution_question: 'ask the buyer how to solve it (own roadside help, tow by Bahn, other)',
    staff_check: 'employee approves the buyer choice, gives the ready time (and recovery price)', buyer_revise: 'employee note becomes a new buyer draft', journey_options: 'timing options after the repair or tow', plan: 'file the dated plan' },
  destination: { site_facts: 'what is wrong at the delivery place', buyer_question: 'ask the buyer where and when', journey_options: 'timing options for redelivery', plan: 'file the plan' },
  tracking: { gap_check: 'is the tracking gap normal', driver_check: 'ask the driver position and ETA', escalate: 'employee task if the driver is silent', plan: 'timing plan if late' },
  incident: { safety: 'driver safe; 112 line sent', employee_task: 'top-priority task, employee decides recovery time, replacement or cancel', replacement: 'replacement driver travel', handover: 'handover time known or check-ins', journey_options: 'timing after the handover', plan: 'file the plan' },
  documents: { find_missing: 'which paper is missing', ask_holder: 'ask the pickup site or driver', staff_task: 'staff chase it', plan: 'timing plan if it delays' },
  expenses: { check_claim: 'claim against the trip and receipt', ask_driver: 'missing receipt or odd amount', plan: 'approval plan or review task' },
  general: { understand: 'read the message and context', act: 'answer, or a normal employee task when unclear' },
};

// Up to three choices for the buyer from one ranked list: fastest, cheapest, balanced (cost + late hours x EUR per late hour).
// Same option under two names merges ("fastest is also cheapest"). xs: [{id, arrive_ms, cost_cents, late_h}]
const pickOptions = (xs, eurPerLateHour) => {
  if (!xs.length) return [];
  const by = (f) => xs.reduce((a, b) => (f(b) < f(a) ? b : a));
  const picks = [['fastest', by((x) => x.arrive_ms)], ['cheapest', by((x) => x.cost_cents)], ['balanced', by((x) => x.cost_cents + x.late_h * eurPerLateHour * 100)]];
  const out = [];
  for (const [name, x] of picks) {
    const same = out.find((o) => o.id === x.id);
    if (same) same.names.push(name); else out.push({ ...x, names: [name] });
  }
  return out;
};

// Offer deadline: the earlier of now + offer_valid_min and the latest time any offered option can still be booked.
const validUntil = (now, offerValidMin, latestBookable = []) => Math.min(now + offerValidMin * 6e4, ...latestBookable.filter((t) => Number.isFinite(t)));

// Drafts from several workflows in one run become one set of lines: duplicates dropped, one ferry, the latest new window,
// buyer and delivery-contact drafts and driver notes collected for the one writer call.
const mergeDrafts = (drafts) => {
  const seen = new Set(), lines = [], out = { customer: [], contact: [], rationale: [], evidence: [], ready_at: '' };
  for (const d of drafts) {
    for (const l of d.lines || []) {
      const key = JSON.stringify(l);
      if (seen.has(key)) continue;
      seen.add(key);
      if (l.kind === 'book_ferry' && lines.some((x) => x.kind === 'book_ferry')) continue;
      if (l.kind === 'change_delivery_window') {
        const k = lines.findIndex((x) => x.kind === 'change_delivery_window');
        if (k >= 0) { if (Date.parse(l.end_at) > Date.parse(lines[k].end_at)) lines[k] = l; continue; }
      }
      lines.push(l);
    }
    if (d.customer_message) out.customer.push(d.customer_message);
    if (d.delivery_contact_message) out.contact.push(d.delivery_contact_message);
    if (d.rationale) out.rationale.push(`${d.workflow}: ${d.rationale}`);
    if (d.evidence_refs) out.evidence.push(d.evidence_refs);
    if (d.ready_at && (!out.ready_at || Date.parse(d.ready_at) > Date.parse(out.ready_at))) out.ready_at = d.ready_at;
  }
  return { lines, ...out };
};

// Urgent only when the driver does not answer AND the car is not visibly fine (tracking off or no progress). Anything else is a
// top or normal task; an employee can still mark it urgent in the control room.
const urgentAllowed = ({ driverSilent, trackingNormal, stopped }) => Boolean(driverSilent && (!trackingNormal || stopped));

// Has the driver left the last question unanswered? (timeline rows from message_driver: out 'To driver: ...', reply '(no reply)')
const driverSilent = (timeline = []) => {
  const msgs = timeline.filter((t) => t.kind === 'driver_message');
  const last = msgs.slice(-1)[0];
  return Boolean(last && (last.text === '(no reply)' || String(last.text).startsWith('To driver:')));
};

// Local time for a person in the given IANA zone, e.g. "Wed 21 Oct 14:30 (Europe/Berlin)".
const localTime = (ms, zone) => {
  try { return new Intl.DateTimeFormat('en-GB', { timeZone: zone || 'UTC', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms)) + ` (${zone || 'UTC'})`; }
  catch (e) { return new Date(ms).toISOString().slice(0, 16) + 'Z'; }
};
