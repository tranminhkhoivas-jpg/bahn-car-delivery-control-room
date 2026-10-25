// Telegram buttons for a buyer offer: one per option plus "None of these". Used by act (first send) and plan_step (reminders).
const offerButtons = (plan = {}) => (plan.options || []).length
  ? [...plan.options.map((o) => ({ key: o.key, label: `${o.key}: ${o.names.join('/')}, ${o.total_eur}, arrives ${o.arrives_local}` })), { key: 'decline', label: 'None of these' }]
  : [];
