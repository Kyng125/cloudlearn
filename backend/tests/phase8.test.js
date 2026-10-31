// Backup download and upload (so data can be kept off a host that wipes its disk).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const { zipSync, unzipSync } = require('fflate');
const Database = require('better-sqlite3');
const { start, as, asUser, Client, files } = require('./helpers');

const dl = async (s, c, name) => { const r = await fetch(`${s.base}/api/admin/backups/${name}/download`, { headers: { cookie: c.cookie } }); return { status: r.status, headers: r.headers, buf: Buffer.from(await r.arrayBuffer()) }; };
const up = async (s, c, buf, name = 'b.zip') => { const fd = new FormData(); fd.append('file', new Blob([buf]), name); const r = await fetch(`${s.base}/api/admin/backups/upload`, { method: 'POST', headers: { cookie: c.cookie }, body: fd }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* */ } return { status: r.status, json: j }; };
const made = async (c) => (await c.post('/api/admin/backups')).json.backup.name;

test('download returns a zip with the database, manifest and uploaded files; only admins may download', async () => {
  const s = await start();
  try {
    const adm = await as(s.base, 'admin');
    fs.mkdirSync(s.uploadDir, { recursive: true }); fs.writeFileSync(path.join(s.uploadDir, 'abc-123'), 'file body');
    const name = await made(adm);
    const r = await dl(s, adm, name);
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/zip'); assert.match(r.headers.get('content-disposition'), /attachment; filename="backup-/);
    const z = unzipSync(new Uint8Array(r.buf));
    assert.deepEqual(Object.keys(z).sort(), ['cloudlearn.db', 'manifest.json', 'uploads/abc-123']);
    assert.equal(Buffer.from(z['uploads/abc-123']).toString(), 'file body');
    for (const who of ['student', 'instructor']) { const c = await as(s.base, who); assert.equal((await dl(s, c, name)).status, 403); assert.equal((await up(s, c, r.buf)).status, 403); }
    assert.equal((await dl(s, new Client(s.base), name)).status, 401);
    assert.equal((await dl(s, adm, 'backup-20200101-000000-zzzz')).status, 404);
    assert.equal((await dl(s, adm, '..%2f..%2fetc')).status, 404);
  } finally { await s.close(); }
});

test('round trip: download, lose everything, upload into an EMPTY server, restore: data and files return', async () => {
  const a = await start();
  let zip;
  try {
    const adm = await as(a.base, 'admin');
    fs.mkdirSync(a.uploadDir, { recursive: true }); fs.writeFileSync(path.join(a.uploadDir, 'keep-me.bin'), 'precious');
    zip = (await dl(a, adm, await made(adm))).buf;
  } finally { await a.close(); }
  // a brand-new server that looks like a free host after it slept: only a freshly bootstrapped admin
  const { openDb } = require('../src/db'); const bcrypt = require('bcryptjs');
  const db = openDb(':memory:');
  db.prepare("INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES ('u_new','New Admin','new@admin.com',?, 'admin', ?)").run(bcrypt.hashSync('new-admin-pass', 4), new Date().toISOString());
  const b = await start({ db, skipSeed: true });
  try {
    const adm = await asUser(b.base, 'new@admin.com'); // login helper uses demo123; use explicit
  } catch { /* expected: helper uses the demo password */ }
  try {
    const adm = new Client(b.base); assert.equal((await adm.login('new@admin.com', 'new-admin-pass')).status, 200);
    const u = await up(b, adm, zip); assert.equal(u.status, 201); assert.equal(u.json.backup.kind, 'uploaded'); assert.ok(u.json.backup.users >= 8);
    assert.equal(db.prepare("SELECT COUNT(*) c FROM courses").get().c, 0, 'uploading alone must not change live data');
    assert.equal((await adm.post(`/api/admin/backups/${u.json.backup.name}/restore`, { confirm: true })).status, 200);
    assert.ok(db.prepare("SELECT COUNT(*) c FROM courses").get().c >= 4);
    assert.equal(fs.readFileSync(path.join(b.uploadDir, 'keep-me.bin'), 'utf8'), 'precious');
    assert.equal((await adm.get('/api/auth/me')).status, 401, 'restore signs everyone out');
    assert.equal((await new Client(b.base).login('admin@cloudlearn.com', 'demo123')).status, 200, 'original accounts are back');
  } finally { await b.close(); }
});

const rejects = async (s, adm, buf, re, status = 400) => { const before = fs.existsSync(s.backupDir) ? fs.readdirSync(s.backupDir).length : 0; const r = await up(s, adm, buf); assert.equal(r.status, status, JSON.stringify(r.json)); assert.match(r.json.error, re); assert.equal(fs.existsSync(s.backupDir) ? fs.readdirSync(s.backupDir).length : 0, before, 'nothing left behind'); };

test('upload rejects anything that is not a healthy CloudLearn backup, leaving nothing behind', async () => {
  const s = await start();
  try {
    const adm = await as(s.base, 'admin'); const good = (await dl(s, adm, await made(adm))).buf; const z = unzipSync(new Uint8Array(good));
    const T = (e) => Buffer.from(zipSync(e));
    await rejects(s, adm, Buffer.from('not a zip at all'), /not a valid backup zip/);
    await rejects(s, adm, Buffer.alloc(0), /empty/);
    await rejects(s, adm, T({ 'manifest.json': z['manifest.json'] }), /not a CloudLearn backup/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': z['manifest.json'], '../evil.txt': Buffer.from('x') }), /Unexpected file/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': z['manifest.json'], 'uploads/../../evil': Buffer.from('x') }), /Unexpected file/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': z['manifest.json'], '/abs/evil': Buffer.from('x') }), /Unexpected file/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': z['manifest.json'], 'run.sh': Buffer.from('x') }), /Unexpected file/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': Buffer.from('{nope') }), /manifest/);
    await rejects(s, adm, T({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': Buffer.from('{"createdAt":"x"}') }), /manifest/);
    await rejects(s, adm, T({ 'cloudlearn.db': Buffer.from('SQLite format 3\0 this is garbage'.repeat(40)), 'manifest.json': z['manifest.json'] }), /database/);
    // a valid SQLite file that is not our schema
    const tmp = path.join(s.backupDir, 'foreign.db'); const d = new Database(tmp); d.exec('CREATE TABLE other(x)'); d.close();
    const foreign = fs.readFileSync(tmp); fs.rmSync(tmp);
    await rejects(s, adm, T({ 'cloudlearn.db': foreign, 'manifest.json': z['manifest.json'] }), /missing tables/);
  } finally { await s.close(); }
});

test('upload refuses a zip bomb (huge when unpacked) and an oversize upload', async () => {
  const s = await start({ config: { maxBackupUploadBytes: 2 * 1024 * 1024 } });
  try {
    const adm = await as(s.base, 'admin'); const good = (await dl(s, adm, await made(adm))).buf; const z = unzipSync(new Uint8Array(good));
    const many = {}; for (let i = 0; i < 25; i++) many[`uploads/f${i}`] = new Uint8Array(30 * 1024 * 1024); // 750 MB of zeros unpacked, small zipped
    const bomb = Buffer.from(zipSync({ 'cloudlearn.db': z['cloudlearn.db'], 'manifest.json': z['manifest.json'], ...many }, { level: 9 }));
    assert.ok(bomb.length < 2 * 1024 * 1024, 'bomb is small enough to be accepted by the size cap: ' + bomb.length);
    await rejects(s, adm, bomb, /too large when unpacked/);
    const r = await up(s, adm, Buffer.alloc(3 * 1024 * 1024, 7)); assert.equal(r.status, 413);
  } finally { await s.close(); }
});

test('an uploaded backup can be deleted like any other, and is listed with kind "uploaded"', async () => {
  const s = await start();
  try {
    const adm = await as(s.base, 'admin'); const good = (await dl(s, adm, await made(adm))).buf;
    const u = await up(s, adm, good); assert.equal(u.status, 201);
    const list = (await adm.get('/api/admin/backups')).json.backups; assert.ok(list.some((b) => b.kind === 'uploaded' && b.name === u.json.backup.name));
    assert.equal((await adm.del(`/api/admin/backups/${u.json.backup.name}`)).status, 200);
    const log = (await adm.get('/api/admin/activity-logs?q=backup')).json.logs.map((l) => l.action);
    assert.ok(log.includes('Downloaded backup') && log.includes('Uploaded backup'));
  } finally { await s.close(); }
});
