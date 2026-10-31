const { openDb } = require('../src/db');
const { createApp } = require('../src/app');
const { seed } = require('../src/seed');

const os = require('os'), fs = require('fs'), path = require('path');
const TEST_CONFIG = { bcryptRounds: 4, throttleIpMax: 1000, staticDir: '/nonexistent' };

async function start(opts = {}) {
  const db = opts.db || openDb(opts.file || ':memory:');
  if (!opts.skipSeed && !db.prepare('SELECT COUNT(*) c FROM users').get().c) seed(db, { rounds: 4 });
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-up-'));
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-bk-'));
  const app = createApp(db, { ...TEST_CONFIG, uploadDir, backupDir, ...(opts.config || {}) });
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  server.keepAliveTimeout = 65000; server.headersTimeout = 66000; // same as production (server.js)
  server.unref(); // a failing assertion must not leave the process hanging on an open server
  const base = `http://127.0.0.1:${server.address().port}`;
  return { db, base, uploadDir, backupDir, close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }) };
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
  async upload(p, fields, fileName, content, headers = {}) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields || {})) fd.append(k, v);
    if (fileName !== null) fd.append('file', new Blob([content]), fileName);
    const res = await fetch(this.base + p, { method: 'POST', headers: { ...(this.cookie ? { cookie: this.cookie } : {}), ...headers }, body: fd });
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  async login(email, password = 'demo123') { return this.post('/api/auth/login', { email, password }); }
}

const DEMO = { student: 'student@cloudlearn.com', instructor: 'instructor@cloudlearn.com', admin: 'admin@cloudlearn.com' };
async function as(base, role) { const c = new Client(base); const r = await c.login(DEMO[role]); if (r.status !== 200) throw new Error(`login ${role} failed ${r.status}`); return c; }

async function asUser(base, email) { const c = new Client(base); const r = await c.login(email); if (r.status !== 200) throw new Error(`login ${email} failed ${r.status}`); return c; }
const USERS = { ins1: 'instructor@cloudlearn.com', ins2: 'instructor2@cloudlearn.com', stu1: 'student@cloudlearn.com', stu2: 'chidi@example.com', stu3: 'amina@example.com', stu4: 'emeka@example.com', stu5: 'ngozi@example.com', admin: 'admin@cloudlearn.com' };
const files = (dir) => require('fs').readdirSync(dir);

module.exports = { start, Client, as, asUser, USERS, files, DEMO };
