// Phase 6b: error handling as the user sees it. Starts its own backend (temp DB) so it can stop/restart it.
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
const step = async (name, fn) => { try { await fn(); results.push([name, 'PASS']); } catch (e) { results.push([name, 'FAIL ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 260)]); await page.screenshot({ path: path.join(os.tmpdir(), `err-fail-${results.length}.png`) }).catch(() => {}); } };
const fresh = async (b, vp) => { if (ctx) await ctx.close(); ctx = await b.newContext({ viewport: vp }); await ctx.route(u => !u.href.startsWith(BASE), r => r.abort()); page = await ctx.newPage(); page.setDefaultTimeout(8000); };
const signIn = async (email, pw = 'demo123') => { await page.goto(BASE, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Sign in', exact: true }).first().click(); await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').fill(pw); await page.locator('input[type=password]').press('Enter'); };
const home = async () => { await page.getByText('Dashboard').first().waitFor(); };
const nav = (label) => page.locator('nav button, aside button').filter({ hasText: label }).first().click();
const toast = (re) => page.getByText(re).first().waitFor();
const big = (mb, name) => { const f = path.join(dir, name); fs.writeFileSync(f, Buffer.alloc(Math.round(mb * 1024 * 1024), 65)); return f; };

(async () => {
  spawnSync('node', ['src/seed.js', '--reset'], { cwd: BACK, env, stdio: 'ignore' });
  await startServer();
  const b = await chromium.launch();
  const vps = process.env.MOBILE ? [{ n: 'mobile', w: 390, h: 800 }] : [{ n: 'desktop', w: 1280, h: 800 }];
  for (const v of vps) {
    const T = (s) => `${v.n}: ${s}`; const vp = { width: v.w, height: v.h };
    const open = async () => { if (v.n === 'mobile') { const bb = await page.locator('aside').first().boundingBox(); if (!bb || bb.x < -1) await page.locator('button[aria-label="Open menu"]').click(); await page.waitForTimeout(350); } };
    const go = async (l) => { await open(); await nav(l); };

    await fresh(b, vp);
    await step(T('E1 lockout after repeated wrong passwords shows a clear message'), async () => {
      for (let i = 0; i < 6; i++) { await signIn('chidi@example.com', 'wrong-pass-' + i); await page.waitForTimeout(250); }
      await toast(/too many|try again later|locked/i);
      await page.context().clearCookies();
    });
    await step(T('E2 correct password is still refused while locked out'), async () => { await fresh(b, vp); await signIn('chidi@example.com', 'demo123'); await toast(/too many|try again later|locked/i); });

    await fresh(b, vp);
    await step(T('E3 registration: duplicate email and weak password give field-level messages'), async () => {
      await page.goto(BASE, { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /get started/i }).first().click();
      await page.getByPlaceholder('Alex Johnson').fill('Dup'); await page.locator('input[type=email]').fill('student@cloudlearn.com');
      await page.locator('input[type=password]').nth(0).fill('secret12'); await page.locator('input[type=password]').nth(1).fill('secret12'); await page.locator('input[type=password]').nth(1).press('Enter');
      await toast(/already|in use|registered/i);
      await page.locator('input[type=email]').fill('weak@example.com'); await page.locator('input[type=password]').nth(0).fill('abc'); await page.locator('input[type=password]').nth(1).fill('abc'); await page.locator('input[type=password]').nth(1).press('Enter');
      await page.waitForTimeout(500); if (await page.getByText('Dashboard').count()) throw new Error('weak password accepted');
    });

    await fresh(b, vp); await signIn('student@cloudlearn.com'); await home();
    await step(T('E4 change password: wrong current password is rejected with a message'), async () => {
      await go('Profile'); await page.getByRole('button', { name: /^security$/i }).click(); await page.locator('input[type=password]').nth(0).fill('not-my-password'); await page.locator('input[type=password]').nth(1).fill('newpass12'); await page.locator('input[type=password]').nth(2).fill('newpass12');
      await page.getByRole('button', { name: 'Update Password' }).click(); await toast(/incorrect|wrong|current password/i);
    });

    await step(T('E5 file over 10 MB is refused and nothing is saved'), async () => {
      await go('Assignments'); const before = sql("select count(*) c from submissions where student_id='u_stu1'")[0].c;
      await page.getByRole('button', { name: 'Submit', exact: true }).first().click(); await page.locator('input[type=file]').setInputFiles(big(10.5, 'huge.txt')); await page.getByRole('button', { name: 'Submit Assignment' }).click();
      await toast(/10 ?MB|too large|size/i); const after = sql("select count(*) c from submissions where student_id='u_stu1'")[0].c; if (after !== before) throw new Error('row saved despite refusal');
      if (fs.existsSync(env.UPLOAD_DIR) && fs.readdirSync(env.UPLOAD_DIR).some(f => fs.statSync(path.join(env.UPLOAD_DIR, f)).size > 10 * 1024 * 1024)) throw new Error('oversize file left on disk');
    });
    await step(T('E6 empty file is refused'), async () => { fs.writeFileSync(path.join(dir, 'empty.txt'), ''); await page.locator('input[type=file]').setInputFiles(path.join(dir, 'empty.txt')); await page.getByRole('button', { name: 'Submit Assignment' }).click(); await toast(/empty|no file|required/i); });
    await step(T('E7 double-clicking Submit creates one submission'), async () => {
      const before = sql("select count(*) c from submissions where student_id='u_stu1'")[0].c;
      fs.writeFileSync(path.join(dir, 'ok.txt'), 'content'); await page.locator('input[type=file]').setInputFiles(path.join(dir, 'ok.txt'));
      await page.getByRole('button', { name: 'Submit Assignment' }).dblclick(); await toast(/submitted successfully/i); await page.waitForTimeout(500);
      const after = sql("select count(*) c from submissions where student_id='u_stu1'")[0].c; if (after !== before + 1) throw new Error(`rows ${before} -> ${after}`);
    });
    await step(T('E8 enrolling twice leaves one enrolment'), async () => {
      const r = []; for (let i = 0; i < 2; i++) r.push((await ctx.request.post(BASE + '/api/courses/c2/enroll', { headers: { origin: BASE } })).status());
      const n = sql("select count(*) c from enrollments where student_id='u_stu1' and course_id='c2'")[0].c; if (n !== 1) throw new Error('enrolments: ' + n + ' statuses ' + r);
    });

    await step(T('E9 expired quiz attempt: scored from saved answers only, no error'), async () => {
      await go('Quizzes'); await page.getByRole('button', { name: /Take Quiz|Start Exam|Retake/ }).first().click(); await page.getByRole('button', { name: /^Start (Quiz|Exam)/ }).click();
      await page.locator('div.space-y-3 > button').first().waitFor(); await page.locator('div.space-y-3 > button').first().click(); await page.waitForTimeout(1600); // debounce save
      sql("update attempts set started_at='2020-01-01T00:00:00.000Z' where completed_at is null and student_id='u_stu1'");
      for (let i = 0; i < 4; i++) { await page.locator('div.space-y-3 > button').nth(1).click().catch(() => {}); const nx = page.getByRole('button', { name: /Next/ }); if (await nx.count()) await nx.click(); }
      await page.getByRole('button', { name: /^Submit (Quiz|Exam)/ }).click(); await page.getByText(/score|%|passed|time/i).first().waitFor();
      const a = sql("select answers_json, completed_at from attempts where student_id='u_stu1' order by started_at desc limit 1")[0];
      const given = JSON.parse(a.answers_json).filter(x => x !== -1 && x !== null && x !== undefined).length;
      if (!a.completed_at) throw new Error('attempt not completed'); if (given > 1) throw new Error('answers given after the deadline were counted: ' + a.answers_json);
    });

    await step(T('E10 session cleared mid-use: next action returns to sign-in with a message'), async () => {
      await page.context().clearCookies(); await go('Profile'); await page.getByRole('button', { name: 'Save Changes' }).click();
      await toast(/session has ended|sign in/i);
      await page.locator('input[type=email]').waitFor(); if (await page.getByText('Dashboard').count()) throw new Error('still showing the signed-in app');
    });

    await fresh(b, vp); await signIn('student@cloudlearn.com'); await home();
    await step(T('E11 server unreachable: action shows an error, page stays usable, recovers on restart'), async () => {
      await go('Assignments'); await page.getByRole('button', { name: 'Submit', exact: true }).first().click(); await page.locator('input[type=file]').setInputFiles(path.join(dir, 'ok.txt'));
      await stopServer(); await page.getByRole('button', { name: 'Submit Assignment' }).click(); await toast(/cannot reach the server/i);
      if (!(await page.getByRole('button', { name: 'Submit Assignment' }).count())) throw new Error('modal closed; the file would be lost');
      await startServer(); await page.getByRole('button', { name: 'Submit Assignment' }).click(); await toast(/submitted successfully/i);
    });

    await fresh(b, vp); await signIn('admin@cloudlearn.com'); await home();
    await step(T('E12 admin: creating a user with an existing email is refused in the dialog'), async () => {
      await go('User Management'); await page.getByRole('button', { name: '+ Add User' }).click(); await page.getByPlaceholder('John Smith').fill('Dup User'); await page.getByPlaceholder('john@example.com').fill('student@cloudlearn.com');
      await page.getByRole('button', { name: 'Create User' }).click(); await page.getByRole('alert').filter({ hasText: /already|in use|exists/i }).waitFor();
    });
    await step(T('E13 admin cannot deactivate or delete their own account from the UI'), async () => {
      await page.keyboard.press('Escape'); const row = page.locator('tr', { hasText: 'admin@cloudlearn.com' }).first(); if (await row.count()) { const dis = await row.locator('button:not([disabled])').filter({ hasText: /deactivate|delete/i }).count(); if (dis) throw new Error('self-destructive action enabled'); }
    });
  }
  const names = results.map(r => r[0]); console.log(results.map(([n, r]) => `${r.startsWith('PASS') ? 'PASS' : 'FAIL'} ${n}${r.startsWith('PASS') ? '' : ' :: ' + r.slice(5)}`).join('\n'));
  await b.close(); await stopServer(); process.exit(results.some(r => r[1] !== 'PASS') ? 1 : 0);
})().catch(async e => { console.log('CRASH', e.message); await stopServer(); process.exit(2); });
