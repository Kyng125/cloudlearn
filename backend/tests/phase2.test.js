const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { start, Client, as, DEMO } = require('./helpers');
const { openDb } = require('../src/db');

// ---------------- TC01 Registration and login (FR1, FR3) ----------------
test('TC01: registration creates a student, signs them in and lands on the student dashboard', async () => {
  const s = await start(); const c = new Client(s.base);
  const r = await c.post('/api/auth/register', { name: 'New Student', email: 'New.Student@Example.com', password: 'secret1' });
  assert.equal(r.status, 201);
  assert.equal(r.json.user.role, 'student');
  assert.equal(r.json.user.email, 'new.student@example.com');
  assert.equal(r.json.home, 'student-dashboard');
  assert.equal('password' in r.json.user || 'password_hash' in r.json.user, false);
  assert.match(r.setCookie, /HttpOnly/); assert.match(r.setCookie, /SameSite=Lax/);
  const me = await c.get('/api/auth/me');
  assert.equal(me.status, 200); assert.equal(me.json.user.name, 'New Student');
  await s.close();
});

test('TC01: self-registration cannot choose a role (privilege escalation)', async () => {
  const s = await start(); const c = new Client(s.base);
  const r = await c.post('/api/auth/register', { name: 'Sneaky', email: 'sneaky@example.com', password: 'secret1', role: 'admin' });
  assert.equal(r.status, 201); assert.equal(r.json.user.role, 'student');
  assert.equal((await c.get('/api/admin/users')).status, 403);
  await s.close();
});

test('TC01: passwords are stored as bcrypt hashes, never in plaintext', async () => {
  const s = await start(); const c = new Client(s.base);
  await c.post('/api/auth/register', { name: 'Hash Check', email: 'hash@example.com', password: 'plaintext-pw' });
  const row = s.db.prepare('SELECT password_hash FROM users WHERE email=?').get('hash@example.com');
  assert.match(row.password_hash, /^\$2[aby]\$/); assert.notEqual(row.password_hash, 'plaintext-pw');
  await s.close();
});

test('TC01: registration rejects duplicates (case-insensitive) and invalid input', async () => {
  const s = await start(); const c = new Client(s.base);
  assert.equal((await c.post('/api/auth/register', { name: 'Dup', email: 'STUDENT@cloudlearn.com', password: 'secret1' })).status, 409);
  assert.equal((await c.post('/api/auth/register', { name: 'X', email: 'not-an-email', password: 'secret1' })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: 'X', email: 'x@example.com', password: '123' })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: '', email: 'y@example.com', password: 'secret1' })).status, 400);
  assert.equal((await c.post('/api/auth/register', { name: 'X', email: 'z@example.com', password: 'a'.repeat(73) })).status, 400);
  await s.close();
});

test('TC01: valid credentials sign in each role and direct them to their own dashboard', async () => {
  const s = await start();
  for (const [role, email] of Object.entries(DEMO)) {
    const c = new Client(s.base); const r = await c.login(email);
    assert.equal(r.status, 200); assert.equal(r.json.user.role, role); assert.equal(r.json.home, `${role}-dashboard`);
  }
  await s.close();
});

test('TC01: logout destroys the session server-side (replayed cookie is rejected)', async () => {
  const s = await start(); const c = new Client(s.base); await c.login(DEMO.student);
  const stolen = c.cookie;
  assert.equal((await c.post('/api/auth/logout')).status, 200);
  const replay = new Client(s.base); replay.cookie = stolen;
  assert.equal((await replay.get('/api/auth/me')).status, 401);
  await s.close();
});

test('TC01: expired sessions are rejected', async () => {
  const s = await start(); const c = new Client(s.base); await c.login(DEMO.student);
  s.db.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z'").run();
  assert.equal((await c.get('/api/auth/me')).status, 401);
  await s.close();
});

// ---------------- TC02 Incorrect password (FR1) ----------------
test('TC02: wrong password is refused with no session and the same message as an unknown email', async () => {
  const s = await start(); const c = new Client(s.base);
  const bad = await c.login(DEMO.student, 'wrong-password');
  const ghost = await c.login('nobody@example.com', 'wrong-password');
  assert.equal(bad.status, 401); assert.equal(ghost.status, 401);
  assert.equal(bad.json.error, ghost.json.error);        // no account enumeration
  assert.equal(bad.setCookie, null);
  assert.equal((await c.get('/api/auth/me')).status, 401);
  await s.close();
});

test('TC02: repeated failures lock the account/IP pair, even for the correct password', async () => {
  const s = await start(); const c = new Client(s.base);
  for (let i = 0; i < 5; i++) assert.equal((await c.login(DEMO.student, 'nope')).status, 401);
  const locked = await c.login(DEMO.student, 'demo123');
  assert.equal(locked.status, 429); assert.ok(Number(locked.headers.get('retry-after')) > 0);
  // a different account from the same IP is not locked by the per-email counter
  assert.equal((await new Client(s.base).login(DEMO.instructor)).status, 200);
  await s.close();
});

test('TC02: the lockout survives a server restart (persistent throttle)', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cl-')), 't.db');
  let s = await start({ file }); const c = new Client(s.base);
  for (let i = 0; i < 5; i++) await c.login(DEMO.student, 'nope');
  await s.close(); s.db.close();
  s = await start({ file, skipSeed: true });
  assert.equal((await new Client(s.base).login(DEMO.student, 'demo123')).status, 429);
  await s.close();
});

test('TC02: a successful login clears earlier failures', async () => {
  const s = await start(); const c = new Client(s.base);
  for (let i = 0; i < 4; i++) await c.login(DEMO.student, 'nope');
  assert.equal((await c.login(DEMO.student)).status, 200);
  for (let i = 0; i < 4; i++) assert.equal((await new Client(s.base).login(DEMO.student, 'nope')).status, 401);
  await s.close();
});

test('TC02: per-IP cap stops one address spraying many accounts', async () => {
  const s = await start({ config: { throttleIpMax: 3 } }); const c = new Client(s.base);
  for (let i = 0; i < 3; i++) await c.login(`ghost${i}@example.com`, 'nope');
  assert.equal((await c.login(DEMO.admin)).status, 429);
  await s.close();
});

// ---------------- TC03 Access control (FR2) ----------------
test('TC03: a student requesting administrator functions is refused and receives no admin data', async () => {
  const s = await start(); const c = await as(s.base, 'student');
  const r = await c.get('/api/admin/users');
  assert.equal(r.status, 403);
  assert.equal(r.json.users, undefined);
  assert.ok(!r.text.includes('@cloudlearn.com'));
  await s.close();
});

test('TC03: cross-role access matrix', async () => {
  const s = await start();
  const target = s.db.prepare("SELECT id FROM users WHERE email='chidi@example.com'").get().id;
  const endpoints = [
    ['GET', '/api/admin/users', undefined],
    ['POST', '/api/admin/users', { name: 'Z', email: 'z@example.com', role: 'student' }],
    ['PATCH', `/api/admin/users/${target}`, { isActive: true }],
    ['DELETE', `/api/admin/users/${target}`, undefined],
    ['GET', '/api/admin/activity-logs', undefined],
  ];
  // anonymous and non-admin roles must be refused on every admin endpoint
  for (const [who, expected] of [['anon', 401], ['student', 403], ['instructor', 403]]) {
    for (const [m, p, b] of endpoints) {
      const c = who === 'anon' ? new Client(s.base) : await as(s.base, who);
      const r = await c.req(m, p, b);
      assert.equal(r.status, expected, `${who} ${m} ${p} -> ${r.status}`);
    }
  }
  // nothing was changed by the refused requests
  assert.equal(s.db.prepare("SELECT is_active FROM users WHERE id=?").get(target).is_active, 1);
  assert.equal(s.db.prepare("SELECT COUNT(*) c FROM users WHERE email='z@example.com'").get().c, 0);
  // authenticated-only endpoints
  for (const p of ['/api/auth/me']) assert.equal((await new Client(s.base).get(p)).status, 401);
  // admin is allowed
  const a = await as(s.base, 'admin');
  assert.equal((await a.get('/api/admin/users')).status, 200);
  assert.equal((await a.get('/api/admin/activity-logs')).status, 200);
  await s.close();
});

test('TC03: cross-origin state-changing requests are refused', async () => {
  const s = await start(); const c = await as(s.base, 'admin');
  const r = await c.post('/api/admin/users', { name: 'Evil', email: 'evil@example.com', role: 'admin' }, { origin: 'https://evil.example' });
  assert.equal(r.status, 403);
  assert.equal(s.db.prepare("SELECT COUNT(*) c FROM users WHERE email='evil@example.com'").get().c, 0);
  await s.close();
});

test('TC03: malformed JSON and unknown routes return clean errors without stack traces', async () => {
  const s = await start(); const c = new Client(s.base);
  const bad = await c.req('POST', '/api/auth/login', '{not json');
  assert.equal(bad.status, 400); assert.ok(!/at .*\.js/.test(bad.text));
  assert.equal((await c.get('/api/nope')).status, 401);                    // anonymous callers cannot probe for routes
  assert.equal((await (await as(s.base, 'student')).get('/api/nope')).status, 404);
  await s.close();
});

// ---------------- TC12 Administration (FR13) ----------------
test('TC12: deactivating an account revokes its session and refuses later sign-in; reactivation restores it', async () => {
  const s = await start(); const admin = await as(s.base, 'admin'); const stu = await as(s.base, 'student');
  const id = (await stu.get('/api/auth/me')).json.user.id;
  const r = await admin.patch(`/api/admin/users/${id}`, { isActive: false });
  assert.equal(r.status, 200); assert.equal(r.json.user.isActive, false);
  assert.equal((await stu.get('/api/auth/me')).status, 401);                 // existing session dead immediately
  const again = await new Client(s.base).login(DEMO.student);
  assert.equal(again.status, 403); assert.equal(again.setCookie, null);
  await admin.patch(`/api/admin/users/${id}`, { isActive: true });
  assert.equal((await new Client(s.base).login(DEMO.student)).status, 200);
  await s.close();
});

test('TC12: lock-out protections (self, last active admin)', async () => {
  const s = await start(); const admin = await as(s.base, 'admin');
  const me = (await admin.get('/api/auth/me')).json.user;
  assert.equal((await admin.patch(`/api/admin/users/${me.id}`, { isActive: false })).status, 409);
  assert.equal((await admin.del(`/api/admin/users/${me.id}`)).status, 409);
  assert.equal((await admin.patch(`/api/admin/users/${me.id}`, { role: 'student' })).status, 409);
  // a second admin can act on the first, but the last active admin is then protected
  const created = await admin.post('/api/admin/users', { name: 'Second Admin', email: 'admin2@example.com', role: 'admin' });
  assert.equal(created.status, 201);
  const a2 = new Client(s.base); assert.equal((await a2.login('admin2@example.com', created.json.temporaryPassword)).status, 200);
  assert.equal((await a2.patch(`/api/admin/users/${me.id}`, { isActive: false })).status, 200);
  assert.equal((await a2.patch(`/api/admin/users/${created.json.user.id}`, { isActive: false })).status, 409);
  assert.equal((await a2.del(`/api/admin/users/${created.json.user.id}`)).status, 409);
  await s.close();
});

test('TC12: role change takes effect immediately (sessions revoked)', async () => {
  const s = await start(); const admin = await as(s.base, 'admin'); const stu = await as(s.base, 'student');
  const id = (await stu.get('/api/auth/me')).json.user.id;
  assert.equal((await admin.patch(`/api/admin/users/${id}`, { role: 'instructor' })).status, 200);
  assert.equal((await stu.get('/api/auth/me')).status, 401);
  assert.equal((await new Client(s.base).login(DEMO.student)).json.user.role, 'instructor');
  await s.close();
});

test('TC12: admin-created accounts get a one-time temporary password and must change it', async () => {
  const s = await start(); const admin = await as(s.base, 'admin');
  const r = await admin.post('/api/admin/users', { name: 'Fresh Staff', email: 'fresh@example.com', role: 'instructor' });
  assert.equal(r.status, 201); assert.ok(r.json.temporaryPassword.length >= 10);
  assert.equal(r.json.user.mustChangePassword, true);
  assert.equal(JSON.stringify((await admin.get('/api/admin/users')).json).includes(r.json.temporaryPassword), false);
  const c = new Client(s.base); const l = await c.login('fresh@example.com', r.json.temporaryPassword);
  assert.equal(l.status, 200); assert.equal(l.json.user.role, 'instructor');
  const other = new Client(s.base); await other.login('fresh@example.com', r.json.temporaryPassword);
  assert.equal((await c.post('/api/auth/change-password', { currentPassword: 'wrong', newPassword: 'brandnew1' })).status, 400);
  assert.equal((await c.post('/api/auth/change-password', { currentPassword: r.json.temporaryPassword, newPassword: 'brandnew1' })).status, 200);
  assert.equal((await c.get('/api/auth/me')).json.user.mustChangePassword, false);
  assert.equal((await other.get('/api/auth/me')).status, 401);       // other sessions signed out
  assert.equal((await new Client(s.base).login('fresh@example.com', r.json.temporaryPassword)).status, 401);
  assert.equal((await new Client(s.base).login('fresh@example.com', 'brandnew1')).status, 200);
  await s.close();
});

test('TC12: deleting a user with course records is refused; deleting an unreferenced user works', async () => {
  const s = await start(); const admin = await as(s.base, 'admin');
  const ins = s.db.prepare("SELECT id FROM users WHERE email='instructor@cloudlearn.com'").get().id;
  assert.equal((await admin.del(`/api/admin/users/${ins}`)).status, 409);
  assert.ok(s.db.prepare('SELECT 1 FROM users WHERE id=?').get(ins));
  const made = await admin.post('/api/admin/users', { name: 'Temp', email: 'temp@example.com', role: 'student' });
  assert.equal((await admin.del(`/api/admin/users/${made.json.user.id}`)).status, 200);
  assert.equal((await admin.del(`/api/admin/users/${made.json.user.id}`)).status, 404);
  await s.close();
});

test('TC12: administrative actions and failed logins are written to the activity log', async () => {
  const s = await start(); const admin = await as(s.base, 'admin');
  await new Client(s.base).login(DEMO.student, 'wrong');
  const id = s.db.prepare("SELECT id FROM users WHERE email='emeka@example.com'").get().id;
  await admin.patch(`/api/admin/users/${id}`, { isActive: false });
  const logs = (await admin.get('/api/admin/activity-logs')).json.logs;
  assert.ok(logs.some((l) => l.action === 'Failed login attempt' && l.status === 'failed' && l.user === DEMO.student));
  assert.ok(logs.some((l) => l.action === 'Deactivated user' && l.detail.includes('emeka@example.com')));
  assert.ok(!JSON.stringify(logs).includes('wrong'));              // attempted passwords never logged
  await s.close();
});

test('seed: relative dates, foreign keys intact, demo data present', async () => {
  const s = await start();
  assert.deepEqual(s.db.pragma('foreign_key_check'), []);
  const due = s.db.prepare("SELECT due_at FROM assignments WHERE id='a2'").get().due_at;
  assert.ok(new Date(due) > new Date(), 'upcoming assignment should be in the future');
  assert.ok(s.db.prepare('SELECT COUNT(*) c FROM courses WHERE is_published=1').get().c >= 4);
  await s.close();
});
