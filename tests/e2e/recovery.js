// Phase 6c: recovery (backup/restore through the browser, corrupt backup, missing uploads folder, restart). Starts its own backend (temp DB) so it can stop/restart it.
const { chromium } = require('playwright');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '../../'); const BACK = path.join(ROOT, 'backend');
const Database = require(path.join(BACK, 'node_modules/better-sqlite3'));
const PORT = process.env.PORT || 3200; const BASE = `http://localhost:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-err-'));
const env = { ...process.env, PORT: String(PORT), DB_FILE: path.join(dir, 'db.sqlite'), UPLOAD_DIR: path.join(dir, 'up'), BACKUP_DIR: path.join(dir, 'bk'), BCRYPT_ROUNDS: '4' };
let srv = null;
const startServer = async () => { srv = spawn('node', ['src/server.js'], { cwd: BACK, env, stdio: 'ignore' }); for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return; } catch { /* waiting */ } await new Promise(r => setTimeout(r, 100)); } throw new Error('server did not start'); };
const stopServer = async () => { if (srv) { srv.kill('SIGKILL'); srv = null; await new Promise(r => setTimeout(r, 300)); } };
const sql = (q, ...a) => { const d = new Database(env.DB_FILE); d.pragma('busy_timeout = 3000'); try { return /^\s*select/i.test(q) ? d.prepare(q).all(...a) : d.prepare(q).run(...a); } finally { d.close(); } };

const results = []; let page, ctx;
const step = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 260)]); await page.screenshot({ path: path.join(os.tmpdir(), `rec-fail-${results.length}.png`) }).catch(() => {}); } };
const fresh = async (b, vp) => { if (ctx) await ctx.close(); ctx = await b.newContext({ viewport: vp }); await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); page = await ctx.newPage(); page.setDefaultTimeout(8000); };
const signIn = async (email, pw = 'demo123') => { await page.goto(BASE, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Sign in', exact: true }).first().click(); await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').fill(pw); await page.locator('input[type=password]').press('Enter'); await page.getByText('Dashboard').first().waitFor(); };
const toast = (re) => page.getByText(re).first().waitFor();
const api = async (method, p, body, cookie) => { const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, cookie: (r.headers.get('set-cookie') || '').split(';')[0], json: await r.json().catch(() => null) }; };

(async () => {
  spawnSync('node', ['src/seed.js', '--reset'], { cwd: BACK, env, stdio: 'ignore' });
  await startServer();
  const b = await chromium.launch(); const vp = { width: process.env.MOBILE ? 390 : 1280, height: 800 }; const open = async () => { if (process.env.MOBILE) { const bb = await page.locator('aside').first().boundingBox(); if (!bb || bb.x < -1) await page.locator('button[aria-label="Open menu"]').click(); await page.waitForTimeout(350); } };
  const go = async (l) => { await open(); await page.locator('nav button, aside button').filter({ hasText: l }).first().click(); };
  await fresh(b, vp);
  let backupName, studentCookie;
  await step('R1 admin creates a backup from the browser and it is listed', async () => {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true }); fs.writeFileSync(path.join(env.UPLOAD_DIR, 'before-backup.bin'), 'kept');
    await signIn('admin@cloudlearn.com'); await go('Backup'); await page.getByRole('button', { name: '+ Create backup' }).click(); await toast('Backup created');
    backupName = fs.readdirSync(env.BACKUP_DIR).filter(n => !n.startsWith('.'))[0]; if (!backupName) throw new Error('no backup directory on disk');
    if (!fs.existsSync(path.join(env.BACKUP_DIR, backupName, 'uploads', 'before-backup.bin'))) throw new Error('uploads were not copied into the backup');
  });
  await step('R2 data changed after the backup (new user, new upload, grade edit)', async () => {
    const reg = await api('POST', '/api/auth/register', { name: 'After Backup', email: 'after@example.com', password: 'secret12' }); if (reg.status !== 201) throw new Error('register ' + reg.status);
    fs.writeFileSync(path.join(env.UPLOAD_DIR, 'after-backup.bin'), 'new'); sql("update users set name='Tampered' where id='u_stu2'");
    const l = await api('POST', '/api/auth/login', { email: 'student@cloudlearn.com', password: 'demo123' }); studentCookie = l.cookie; if (!studentCookie) throw new Error('no student session');
  });
  await step('R3 restore from the browser: confirmation required, everyone signed out', async () => {
    await page.getByRole('button', { name: 'Restore' }).first().click(); await page.getByText(/replaces ALL current data/i).waitFor();
    await page.getByRole('button', { name: /Restore and sign everyone out/ }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().waitFor(); // signed out, back on the public page
  });
  await step('R4 after restore: post-backup changes are gone, original data and files are back', async () => {
    if (sql("select count(*) c from users where email='after@example.com'")[0].c !== 0) throw new Error('new user survived the restore');
    if (sql("select name from users where id='u_stu2'")[0].name === 'Tampered') throw new Error('edited row survived');
    if (fs.existsSync(path.join(env.UPLOAD_DIR, 'after-backup.bin'))) throw new Error('post-backup upload survived');
    if (!fs.existsSync(path.join(env.UPLOAD_DIR, 'before-backup.bin'))) throw new Error('pre-backup upload missing');
  });
  await step('R5 sessions that existed before the restore no longer work', async () => { const r = await api('GET', '/api/auth/me', null, studentCookie); if (r.status !== 401) throw new Error('old session still valid: ' + r.status); });
  await step('R6 restore took an automatic safety backup of the state it replaced', async () => { const n = fs.readdirSync(env.BACKUP_DIR).length; if (n < 2) throw new Error('backups: ' + n); });
  await step('R7 a corrupted backup is refused and current data is untouched', async () => {
    await signIn('admin@cloudlearn.com'); await go('Backup'); await page.getByRole('button', { name: '+ Create backup' }).click(); await page.waitForTimeout(800);
    const names = fs.readdirSync(env.BACKUP_DIR).map(n => ({ n, t: fs.statSync(path.join(env.BACKUP_DIR, n)).mtimeMs })).sort((a, b) => b.t - a.t); const target = names[0].n;
    fs.writeFileSync(path.join(env.BACKUP_DIR, target, 'cloudlearn.db'), Buffer.from('this is not a database'.repeat(50)));
    sql("update users set name='Current State' where id='u_stu3'");
    await go('Dashboard'); await go('Backup'); await page.getByText('Backup History').waitFor();
    const rows = page.locator('tr', { hasText: /manual|auto|safety/i }); await page.getByRole('button', { name: 'Restore' }).first().click();
    await page.getByRole('button', { name: /Restore and sign everyone out/ }).click(); await page.waitForTimeout(1500);
    if (sql("select name from users where id='u_stu3'")[0].name !== 'Current State') throw new Error('current data was overwritten by a corrupt backup');
    void rows;
  });
  await step('R8 missing uploads folder: downloads fail cleanly, uploads work again, server stays up', async () => {
    await fresh(b, vp); const l = await api('POST', '/api/auth/login', { email: 'student@cloudlearn.com', password: 'demo123' }); const c = l.cookie;
    fs.rmSync(env.UPLOAD_DIR, { recursive: true, force: true });
    const d = await fetch(BASE + '/api/submissions/s1/download', { headers: { cookie: c } }); if (![404, 410].includes(d.status)) throw new Error('download of missing file returned ' + d.status);
    if (!(await fetch(BASE + '/api/health')).ok) throw new Error('server unhealthy');
    const fd = new FormData(); fd.append('content', 'x'); fd.append('file', new Blob(['hello after loss']), 'again.txt');
    const u = await fetch(BASE + '/api/assignments/a2/submit', { method: 'POST', headers: { cookie: c, origin: BASE }, body: fd }); if (u.status !== 201 && u.status !== 200) throw new Error('upload after folder loss returned ' + u.status + ' ' + await u.text());
  });
  await step('R9 server restart: data and signed-in sessions survive', async () => {
    const l = await api('POST', '/api/auth/login', { email: 'chidi@example.com', password: 'demo123' }); await stopServer(); await startServer();
    const me = await api('GET', '/api/auth/me', null, l.cookie); if (me.status !== 200) throw new Error('session lost after restart: ' + me.status);
    if (sql("select count(*) c from users")[0].c < 8) throw new Error('users missing');
  });
  await step('R10 free-host reset: download a backup, lose everything, upload it into the empty server, restore', async () => {
    await fresh(b, vp); await signIn('admin@cloudlearn.com'); await go('Backup');
    await page.getByRole('button', { name: '+ Create backup' }).click(); await toast('Backup created');
    const [dlEvent] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download' }).first().click()]);
    const zipPath = path.join(dir, 'downloaded.zip'); await dlEvent.saveAs(zipPath);
    if (!/^backup-.*\.zip$/.test(dlEvent.suggestedFilename()) || fs.statSync(zipPath).size < 1000) throw new Error('bad download: ' + dlEvent.suggestedFilename());
    // the host sleeps: everything on disk disappears, the server comes back with only a freshly created admin
    await stopServer(); fs.rmSync(env.DB_FILE, { force: true }); fs.rmSync(env.DB_FILE + '-wal', { force: true }); fs.rmSync(env.DB_FILE + '-shm', { force: true }); fs.rmSync(env.UPLOAD_DIR, { recursive: true, force: true }); fs.rmSync(env.BACKUP_DIR, { recursive: true, force: true });
    env.ADMIN_EMAIL = 'fresh@admin.com'; env.ADMIN_PASSWORD = 'fresh-admin-pass'; await startServer();
    if (sql('select count(*) c from courses')[0].c !== 0) throw new Error('server was not empty after the wipe');
    await fresh(b, vp); await signIn('fresh@admin.com', 'fresh-admin-pass'); await go('Backup');
    await page.locator('input[type=file]').setInputFiles(zipPath); await toast('Backup uploaded');
    await page.getByRole('button', { name: 'Restore' }).first().click(); await page.getByRole('button', { name: /Restore and sign everyone out/ }).click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).first().waitFor();
    if (sql('select count(*) c from courses')[0].c < 4) throw new Error('courses did not come back');
    if (!fs.existsSync(path.join(env.UPLOAD_DIR, 'before-backup.bin')) && !fs.existsSync(env.UPLOAD_DIR)) throw new Error('uploads folder missing');
    await signIn('admin@cloudlearn.com'); // the original admin works again
  });
  console.log(results.map(([n, r]) => `${r.startsWith('PASS') ? 'PASS' : 'FAIL'} ${n}${r.startsWith('PASS') ? '' : ' :: ' + r.slice(5)}`).join('\n'));
  await b.close(); await stopServer(); process.exit(results.some(r => r[1] !== 'PASS') ? 1 : 0);
})().catch(async e => { console.log('CRASH', e.message); await stopServer(); process.exit(2); });
