const test = require('node:test');
const assert = require('node:assert/strict');
const { start, Client } = require('./helpers');
const { openDb } = require('../src/db');
const { bootstrap } = require('../src/bootstrap');

test('security headers: CSP, nosniff, framing and permissions policy are always sent; HSTS only on a secure deployment', async () => {
  const plain = await start();
  const secure = await start({ config: { cookieSecure: true, trustProxy: true } });
  try {
    const a = await new Client(plain.base).get('/api/health');
    const csp = a.headers.get('content-security-policy');
    assert.match(csp, /default-src 'self'/); assert.match(csp, /script-src 'self'(;|$)/); assert.match(csp, /frame-ancestors 'none'/); assert.match(csp, /object-src 'none'/);
    assert.equal(a.headers.get('x-content-type-options'), 'nosniff'); assert.equal(a.headers.get('x-frame-options'), 'DENY'); assert.ok(a.headers.get('permissions-policy'));
    assert.equal(a.headers.get('strict-transport-security'), null);
    const b = await new Client(secure.base).get('/api/health');
    assert.match(b.headers.get('strict-transport-security'), /max-age=\d+/);
  } finally { await plain.close(); await secure.close(); }
});

test('secure deployment: session cookie is Secure, HttpOnly, SameSite=Lax', async () => {
  const s = await start({ config: { cookieSecure: true, trustProxy: true } });
  try {
    const r = await new Client(s.base).login('student@cloudlearn.com');
    assert.equal(r.status, 200);
    assert.match(r.setCookie, /;\s*Secure/); assert.match(r.setCookie, /HttpOnly/); assert.match(r.setCookie, /SameSite=Lax/);
  } finally { await s.close(); }
});

test('trust proxy: the client address comes from X-Forwarded-For, so one user cannot lock out another behind the proxy', async () => {
  const s = await start({ config: { trustProxy: true, throttleIpMax: 1000 } });
  try {
    for (let i = 0; i < 5; i++) await new Client(s.base).post('/api/auth/login', { email: 'chidi@example.com', password: 'bad' }, { 'x-forwarded-for': '203.0.113.7' });
    // same email from the SAME address is now locked, a different address is not (per email+IP throttle)
    const locked = await new Client(s.base).post('/api/auth/login', { email: 'chidi@example.com', password: 'demo123' }, { 'x-forwarded-for': '203.0.113.7' });
    assert.equal(locked.status, 429);
    const other = await new Client(s.base).post('/api/auth/login', { email: 'chidi@example.com', password: 'demo123' }, { 'x-forwarded-for': '198.51.100.9' });
    assert.equal(other.status, 200);
  } finally { await s.close(); }
});

test('health reports whether storage is ephemeral', async () => {
  const s = await start({ config: { ephemeral: true } });
  try { const r = await new Client(s.base).get('/api/health'); assert.equal(r.json.ephemeral, true); assert.ok(r.json.startedAt); } finally { await s.close(); }
});

test('bootstrap: production with an empty database refuses to start without a strong ADMIN_PASSWORD', () => {
  const db = openDb(':memory:');
  assert.throws(() => bootstrap(db, { NODE_ENV: 'production' }, { rounds: 4 }), /ADMIN_PASSWORD/);
  assert.throws(() => bootstrap(db, { NODE_ENV: 'production', ADMIN_PASSWORD: 'short' }, { rounds: 4 }), /ADMIN_PASSWORD/);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 0);
});

test('bootstrap: creates exactly one admin from the environment, and never overwrites existing data', async () => {
  const db = openDb(':memory:');
  const msg = bootstrap(db, { NODE_ENV: 'production', ADMIN_EMAIL: 'Boss@School.edu', ADMIN_PASSWORD: 'a-long-secret-1' }, { rounds: 4 });
  assert.match(msg, /boss@school.edu/);
  const users = db.prepare('SELECT email, role, password_hash FROM users').all();
  assert.equal(users.length, 1); assert.equal(users[0].role, 'admin'); assert.notEqual(users[0].password_hash, 'a-long-secret-1');
  assert.match(bootstrap(db, { NODE_ENV: 'production' }, { rounds: 4 }), /kept/); // second boot: data kept, no password needed
  assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1);
});

test('bootstrap demo mode: demo data present but the admin does NOT use the public demo password', async () => {
  const db = openDb(':memory:');
  bootstrap(db, { NODE_ENV: 'production', BOOTSTRAP_DEMO: '1', ADMIN_EMAIL: 'admin@cloudlearn.com', ADMIN_PASSWORD: 'a-long-secret-1', DEMO_PASSWORD: 'demo-pass-9' }, { rounds: 4 });
  assert.ok(db.prepare("SELECT COUNT(*) c FROM courses").get().c >= 4);
  const s = await start({ db, skipSeed: true });
  try {
    assert.equal((await new Client(s.base).login('admin@cloudlearn.com', 'demo123')).status, 401);
    assert.equal((await new Client(s.base).login('admin@cloudlearn.com', 'demo-pass-9')).status, 401, 'demo password must not open the admin');
    assert.equal((await new Client(s.base).login('admin@cloudlearn.com', 'a-long-secret-1')).status, 200);
    assert.equal((await new Client(s.base).login('student@cloudlearn.com', 'demo-pass-9')).status, 200);
  } finally { await s.close(); }
});
