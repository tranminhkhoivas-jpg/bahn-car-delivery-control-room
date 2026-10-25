// Tunable numbers for the On-the-road agent: [default, unit, section, what it does].
// All values are PLACEHOLDERS picked by us; Bahn changes them on the control room Settings page (stored in otr_settings).
// setup.mjs inserts missing keys and never overwrites a value someone edited. get_order_context returns them as `settings`.
const SETTING_DEFAULTS = {
  approval_buffer_min: [30, 'min', 'Planning', 'Time a person needs to approve; searches only offer departures after now + this'],
  repair_slack_min: [60, 'min', 'Planning', 'Extra margin added to a repair or recovery ready time given by staff before any booking is planned from it'],
  booking_slack_min: [60, 'min', 'Planning', 'Extra margin kept before a ferry check-in or a train/flight departure so a small new delay does not break the booking'],
  on_time_spare_h: [3, 'h', 'Planning', 'Arrival counts as on time only with this much spare before the delivery window ends'],
  handover_checkin_min: [30, 'min', 'Reminders', 'When nobody knows yet when the car is ready or a driver can start: staff are asked again this often, and the agent re-checks tracking and sailings'],
  offer_valid_min: [120, 'min', 'Planning', 'How long the buyer has to answer an offer (shorter if an option sells out sooner)'],
  eur_per_late_hour: [25, 'EUR', 'Planning', 'Cost of one hour late, used to pick the balanced option (cost + late hours x this)'],
  booking_retries: [3, 'tries', 'Planning', 'Booking attempts before a booking counts as failed'],
  dkk_per_eur: [7.46, 'DKK', 'Planning', 'Exchange rate for DKK expense claims'],
  road_speed_kmh: [75, 'km/h', 'Driving rules', 'Average road speed for arrival estimates'],
  break_after_min: [270, 'min', 'Driving rules', 'Driving before a break is due (EU 4.5 h)'],
  break_min: [45, 'min', 'Driving rules', 'Length of that break'],
  daily_drive_max_min: [540, 'min', 'Driving rules', 'Driving per day before the daily rest (EU 9 h)'],
  daily_rest_min: [660, 'min', 'Driving rules', 'Daily rest (EU 11 h)'],
  normal_gap_min: [45, 'min', 'Tracking', 'Silence from the car tracker up to this is normal'],
  driver_reply_wait_s: [60, 's', 'Waiting and reminders', 'How long the agent waits for a driver answer before moving on'],
  reminder_wait_driver_min: [15, 'min', 'Waiting and reminders', 'Driver silent this long: automatic reminder'],
  reminder_wait_buyer_min: [30, 'min', 'Waiting and reminders', 'Buyer or delivery contact silent this long: reminder draft for approval'],
  reminder_wait_employee_min: [15, 'min', 'Waiting and reminders', 'Plan or task untouched this long: ping the employee'],
  reminder_count: [2, 'times', 'Waiting and reminders', 'Reminders before handing over to a person (or escalating to the escalation role)'],
  escalation_role: ['Shift lead', '', 'Waiting and reminders', 'Who gets escalations when the employee does not act'],
  employee_timezone: ['Europe/Helsinki', '', 'Display', 'Time zone of control room times (buyer times use the delivery address zone)'],
  glide_routing: [0.5, '0-1', 'AI thresholds', 'GLiDE yes-score needed to send an event to a workflow'],
  glide_fact_check: [0.5, '0-1', 'AI thresholds', 'Simulated reply is rejected when its contradiction score reaches this'],
  glide_close: [0.8, '0-1', 'AI thresholds', 'GLiDE score needed to close a case without a person'],
  glide_buyer_reply: [0.6, '0-1', 'AI thresholds', 'Score needed to accept a buyer or delivery-contact reply as clear'],
  glide_note_clarity: [0.6, '0-1', 'AI thresholds', 'Score needed to treat an employee note as clear'],
  glide_reopen: [0.6, '0-1', 'AI thresholds', 'Score needed to reopen a closed case on a new buyer message'],
  glide_grounding: [0.05, '0-1', 'AI thresholds', 'GLiDE score needed to treat the drafted buyer, contact and driver messages as backed by the plan facts (correct drafts scored 0.13-0.19, one wrong price or place 0.01)'],
  glide_resume: [0.4, '0-1', 'AI thresholds', 'Score needed to trust GLiDE choice of the stage to resume from'],
  reply_in_customer_language: ['on', 'on/off', 'Customer contact', 'Send buyer and delivery-contact messages in their language (Claude Haiku 5.5 translates the approved English; the English stays below). Bahn: customer language, usually English'],
  confirm_with_delivery_contact: ['on', 'on/off', 'Customer contact', 'Also confirm a new time with the delivery contact when it is not the buyer'],
  autosend_buyer_reminder: ['off', 'on/off', 'Customer contact', 'Send buyer reminders without approval'],
  autosend_offer_update: ['off', 'on/off', 'Customer contact', 'Send "an updated offer is coming" without approval'],
  autosend_delivery_contact: ['off', 'on/off', 'Customer contact', 'Send delivery-contact confirmations without approval'],
  demo_clock_speed: [1, 'x', 'Demo', 'Simulated minutes per real minute'],
  demo_clock_started_at: ['', 'ISO', 'Demo', 'Real time the demo clock started (reset by seeding); empty = frozen at the dataset time'],
  tg_update_offset: ['0', '', 'Demo', 'Telegram polling position (system)'],
  sim_person_behaviour: ['answer', 'answer|fastest|cheapest|balanced|decline|unclear|silent', 'Demo', 'How the simulated buyer and delivery contact answer on Telegram (test switch)'],
};
// Simulated "now": dataset snapshot + real time passed since the demo clock started, times the speed.
const simNow = (snapshotIso, S, real = Date.now()) => {
  const t0 = Date.parse(snapshotIso), start = Date.parse(S.demo_clock_started_at || '');
  return Number.isNaN(start) ? t0 : t0 + Math.max(0, real - start) * (Number(S.demo_clock_speed) || 1);
};
// Table rows -> { key: value } with defaults for anything missing; numbers stay numbers.
const readSettings = (rows = []) => {
  const S = Object.fromEntries(Object.entries(SETTING_DEFAULTS).map(([k, [v]]) => [k, v]));
  for (const r of rows) if (r && r.key in S && r.value != null) S[r.key] = typeof S[r.key] === 'number' && r.value !== '' && !Number.isNaN(Number(r.value)) ? Number(r.value) : typeof S[r.key] === 'number' ? S[r.key] : String(r.value);
  return S;
};
