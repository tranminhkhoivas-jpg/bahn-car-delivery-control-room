import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function callGlide(body) {
  const r = await fetch('https://api.fastino.ai/v1/systemone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.FASTINO_API_KEY },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`GLiDE HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

export default class GlideProvider {
  constructor(options = {}) {
    this.config = options.config || {};
    this.label = this.config.label || options.label || options.id || 'glide';
  }
  id() { return this.label; }
  async callApi(_prompt, context) {
    const { kind, asked, reply, message, facts, messages } = context.vars;
    if (kind === 'buyer_reply') {
      const g = await callGlide({
        model: 'fastino/GLiDE', store: false,
        state: { asked, reply },
        questions: {
          accept: {
            type: 'noul',
            instructions: 'Bahn Express offered the buyer of a car delivery a changed plan (see asked). Does the reply clearly ACCEPT the offer?',
            criteria: { true: 'Clearly accepts or agrees', false: 'Does not clearly accept (declines, hesitates, asks a question, unrelated)' }
          }
        }
      });
      const score = Number(g.answers?.accept?.noul);
      const pass = score >= 0.6;
      return { output: JSON.stringify({ kind, score, pass }) };
    }
    if (kind === 'reopen') {
      const g = await callGlide({
        model: 'fastino/GLiDE', store: false,
        state: { message, case: 'closed' },
        questions: {
          new_issue: {
            type: 'noul',
            instructions: 'Bahn Express closed this car delivery case. Does the message raise a new problem, request or question that needs action (not just thanks, ok or a greeting)?',
            criteria: { true: 'Needs action', false: 'Nothing new to do' }
          }
        }
      });
      const score = Number(g.answers?.new_issue?.noul);
      const pass = score >= 0.6;
      return { output: JSON.stringify({ kind, score, pass }) };
    }
    if (kind === 'grounding') {
      const g = await callGlide({
        model: 'fastino/GLiDE', store: false,
        state: { facts, messages },
        questions: {
          grounded: {
            type: 'noul',
            instructions: 'Is every time, date, price, place and promise in messages backed by facts (nothing invented, nothing changed)?',
            criteria: { true: 'Everything is in the facts', false: 'Something is not in the facts' }
          }
        }
      });
      const score = Number(g.answers?.grounded?.noul);
      const pass = score >= 0.05;
      return { output: JSON.stringify({ kind, score, pass }) };
    }
    return { error: `unknown GLiDE check kind: ${kind}` };
  }
}
