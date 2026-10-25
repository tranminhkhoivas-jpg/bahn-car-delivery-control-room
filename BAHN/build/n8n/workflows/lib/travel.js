// Shared by several Code nodes (setup.mjs pastes it where a node says "// @include travel.js"; test_workflows.mjs does the same).
// City coordinates, distances and the mock train/flight search. No LLM: every number is computed here.
const CITIES = { // dataset cities (sites, addresses, driver homes): lat, lon, country
  Aalborg: [57.05, 9.92, 'DK'], Aarhus: [56.16, 10.2, 'DK'], Antwerp: [51.22, 4.4, 'BE'], Berlin: [52.52, 13.4, 'DE'], Bordeaux: [44.84, -0.58, 'FR'],
  Cologne: [50.94, 6.96, 'DE'], Copenhagen: [55.68, 12.57, 'DK'], Dusseldorf: [51.23, 6.78, 'DE'], Espoo: [60.21, 24.66, 'FI'], Frankfurt: [50.11, 8.68, 'DE'],
  Ghent: [51.05, 3.72, 'BE'], Gothenburg: [57.71, 11.97, 'SE'], Graz: [47.07, 15.44, 'AT'], Hamburg: [53.55, 9.99, 'DE'], Helsinki: [60.17, 24.94, 'FI'],
  Jyvaskyla: [62.24, 25.75, 'FI'], Lahti: [60.98, 25.66, 'FI'], Leipzig: [51.34, 12.37, 'DE'], Lille: [50.63, 3.06, 'FR'], Linkoping: [58.41, 15.62, 'SE'],
  Lyon: [45.76, 4.84, 'FR'], Malmo: [55.6, 13, 'SE'], Marseille: [43.3, 5.37, 'FR'], Munich: [48.14, 11.58, 'DE'], Odense: [55.4, 10.39, 'DK'],
  Oulu: [65.01, 25.47, 'FI'], Paris: [48.86, 2.35, 'FR'], Pori: [61.48, 21.8, 'FI'], Rotterdam: [51.92, 4.48, 'NL'], Seinajoki: [62.79, 22.84, 'FI'],
  Stockholm: [59.33, 18.07, 'SE'], Stuttgart: [48.78, 9.18, 'DE'], Tampere: [61.5, 23.76, 'FI'], Turku: [60.45, 22.27, 'FI'], Uppsala: [59.86, 17.64, 'SE'],
  Vantaa: [60.29, 25.04, 'FI'], Vienna: [48.21, 16.37, 'AT'],
};
const cityKey = (name) => String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const cityOf = (name) => CITIES[cityKey(name)] || null;
// ponytail: straight line x 1.25 as a road/rail distance; real routing would need a map service.
const distKm = (a, b) => {
  const p = cityOf(a), q = cityOf(b);
  if (!p || !q) return null;
  const r = Math.PI / 180, h = Math.sin((q[0] - p[0]) * r / 2) ** 2 + Math.cos(p[0] * r) * Math.cos(q[0] * r) * Math.sin((q[1] - p[1]) * r / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.25);
};
// Last known position: pickup -> delivery straight line at the tracked progress, snapped to the nearest dataset city.
// ponytail: ignores ferry geometry; good enough to pick a handover city and a replacement driver.
const nearestCity = (from, to, progress) => {
  const p = cityOf(from), q = cityOf(to);
  if (!p || !q) return null;
  const f = Math.min(Math.max(Number(progress) || 0, 0), 1), lat = p[0] + (q[0] - p[0]) * f, lon = p[1] + (q[1] - p[1]) * f;
  let best = null, bestD = Infinity;
  for (const [name, c] of Object.entries(CITIES)) {
    const d = (c[0] - lat) ** 2 + ((c[1] - lon) * Math.cos(lat * Math.PI / 180)) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return { city: best, lat: +lat.toFixed(2), lon: +lon.toFixed(2) };
};
const HOTEL_NIGHT_CENTS = { Hamburg: 11580, Stockholm: 10740, Cologne: 6900, Gothenburg: 8900 }; // dataset hotel fares; others use the flat mock below
const HOTEL_DEFAULT_NIGHT_CENTS = 11000;
const travelHash = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
const isoMin = (t) => new Date(t).toISOString().slice(0, 16) + 'Z';

// Train/flight options for one person from A to B, leaving no earlier than `earliest` (ms).
// Dataset TRAIN/FLIGHT quotes on the same city pair are used as-is; GENERATED options (source 'mock_generated') fill the gaps:
// trains on one landmass under 900 km, flights over 400 km. Deterministic: same input -> same options, prices and sold-out flags.
// Ranking: earliest arrival, then cost.
const searchTravel = ({ quotes = [], from, to, earliest, days = 3, failed = [] }) => {
  const A = cityKey(from), B = cityKey(to), km = distKm(A, B);
  const out = [];
  if (!cityOf(A) || !cityOf(B)) return { ok: false, error: `Unknown city: ${!cityOf(A) ? from : to}. Known: ${Object.keys(CITIES).join(', ')}` };
  if (A === B) return { ok: false, error: 'from_city and to_city are the same; no travel needed.' };
  const bad = new Set(failed);
  for (const q of quotes.filter((x) => ['TRAIN', 'FLIGHT'].includes(x.kind) && cityKey(x.from_city) === A && cityKey(x.to_city) === B)) {
    const leave = Date.parse(q.departure_at) - (q.local_transfer_hours || 0) * 36e5;
    out.push({ option_id: q.id, source: 'dataset_quote', mode: q.kind, provider: q.provider, from_city: A, to_city: B,
      leave_at: isoMin(leave), departs: isoMin(q.departure_at), arrives: isoMin(q.arrival_at), cost_cents: q.quote_cents,
      status: bad.has(q.id) ? 'SOLD_OUT' : q.status, note: q.capacity_note || '' });
  }
  const sameLand = (cityOf(A)[2] === 'FI') === (cityOf(B)[2] === 'FI'); // Finland is reached by sea or air only
  const modes = [];
  if (sameLand && km < 900) modes.push({ mode: 'TRAIN', provider: 'Northrail', hours: [6, 9, 12, 15, 18], before: 0.5, legH: km / 110 + 1, after: 0.5, cents: 1500 + km * 18 });
  if (km > 400) modes.push({ mode: 'FLIGHT', provider: 'Aeralis Travel', hours: [7, 13, 19], before: 1.5, legH: 1.5 + km / 700, after: 1, cents: 9000 + km * 12 });
  const day0 = Date.UTC(new Date(earliest).getUTCFullYear(), new Date(earliest).getUTCMonth(), new Date(earliest).getUTCDate());
  for (const m of modes) for (let d = 0; d <= days; d++) for (const hr of m.hours) {
    const dep = day0 + (d * 24 + hr) * 36e5;
    if (dep - m.before * 36e5 < earliest) continue;
    const id = `gen-${m.mode.toLowerCase()}-${A.toLowerCase()}-${B.toLowerCase()}-${isoMin(dep).replace(/[-:]/g, '')}`;
    const soldOut = travelHash(id + 'cap') < 0.15 || bad.has(id);
    out.push({ option_id: id, source: 'mock_generated', mode: m.mode, provider: m.provider, from_city: A, to_city: B,
      leave_at: isoMin(dep - m.before * 36e5), departs: isoMin(dep), arrives: isoMin(Math.ceil((dep + (m.legH + m.after) * 36e5) / 3e5) * 3e5), // to 5 min
      cost_cents: soldOut ? null : Math.round(m.cents * (0.85 + 0.3 * travelHash(id + 'price')) / 100) * 100,
      status: soldOut ? 'SOLD_OUT' : 'AVAILABLE_QUOTE', note: bad.has(id) ? 'sold out at booking attempt' : 'MOCK generated option, not a real quote' });
  }
  const usable = out.filter((o) => o.status === 'AVAILABLE_QUOTE' && Date.parse(o.leave_at) >= earliest)
    .sort((a, b) => Date.parse(a.arrives) - Date.parse(b.arrives) || a.cost_cents - b.cost_cents)
    .map((o, k) => ({ ...o, rank: k + 1, cost_eur: o.cost_cents / 100 }));
  return { ok: true, km, options: usable, recommended: usable[0]?.option_id || null,
    not_usable: out.filter((o) => !usable.some((u) => u.option_id === o.option_id)).map((o) => ({ option_id: o.option_id, departs: o.departs, why_not: o.status === 'SOLD_OUT' ? 'sold out' : 'leaves before earliest' })) };
};
