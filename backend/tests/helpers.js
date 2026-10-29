const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

const TEST_CONFIG = { bcryptRounds: 4, throttleIpMax: 1000, staticDir: '/nonexistent' };

async function start(opts = {}) {
  const db = opts.db || openDb(opts.file || ':memory:');
  if (!opts.skipSeed && !db.prepare('SELECT COUNT(*) c FROM users').get().c) seed(db, { rounds: 4 });
  const app = createApp(db, { ...TEST_CONFIG, ...(opts.config || {}) });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  server.unref(); // a failing assertion must not leave the process hanging on an open server
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
}

// Minimal HTTP client with a cookie jar so each instance behaves like one browser.
class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async req(method, path, body, headers = {}) {
    const res = await fetch(this.base + path, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(this.cookie ? { cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) { const kv = setCookie.split(';')[0]; this.cookie = kv.endsWith('=') ? '' : kv; }
    let json = null; const text = await res.text();
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers, setCookie };
  }
  get(p, h) { return this.req('GET', p, undefined, h); }
  post(p, b, h) { return this.req('POST', p, b === undefined ? {} : b, h); }
  patch(p, b, h) { return this.req('PATCH', p, b, h); }
  del(p, h) { return this.req('DELETE', p, undefined, h); }
  async login(email, password = 'demo123') { return this.post('/api/auth/login', { email, password }); }
}

const DEMO = { student: 'student@cloudlearn.com', instructor: 'instructor@cloudlearn.com', admin: 'admin@cloudlearn.com' };
async function as(base, role) { const c = new Client(base); const r = await c.login(DEMO[role]); if (r.status !== 200) throw new Error(`login ${role} failed ${r.status}`); return c; }

module.exports = { start, Client, as, DEMO };
