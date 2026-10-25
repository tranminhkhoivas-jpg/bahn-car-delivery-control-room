import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../../../.env');
if (fs.existsSync(envFile)) for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const N8N = process.env.N8N_API_URL || 'http://127.0.0.1:5678';

export default class ToolProvider {
  constructor(options = {}) {
    this.config = options.config || {};
    this.label = this.config.label || options.label || options.id || 'tools';
  }
  id() { return this.label; }
  async callApi(_prompt, context) {
    const { tool, payload } = context.vars;
    const r = await fetch(`${N8N}/webhook/bahn/test/${tool}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    const text = await r.text();
    return { output: text };
  }
}
