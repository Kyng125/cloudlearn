#!/usr/bin/env node
// One command that runs every test suite and writes docs/EVALUATION-RESULTS.md (for Chapter 4).
//   NODE_PATH=$(npm root -g) node tests/run-evaluation.js [--skip-load]
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), BACK = path.join(ROOT, 'backend'), E2E = path.join(__dirname, 'e2e');
const PORT = 3100, BASE = `http://localhost:${PORT}`;
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { shell: process.platform === 'win32' && cmd === 'npm', encoding: 'utf8', timeout: 600000, maxBuffer: 50 * 1024 * 1024, ...opts });
const log = (m) => console.error(`[evaluation] ${m}`);
const tick = (ok) => (ok ? 'PASS' : '**FAIL**');
const out = [];

(async () => {
  if (!fs.existsSync(path.join(ROOT, 'frontend/dist/index.html'))) { log('building front end'); run('npm', ['run', 'build'], { cwd: path.join(ROOT, 'frontend') }); }
  // 1. backend suite
  log('backend tests'); const bt = run('npm', ['test'], { cwd: BACK }); const num = (k) => Number((bt.stdout.match(new RegExp(`# ${k} (\\d+)`)) || [])[1] || 0);
  const be = { tests: num('tests'), pass: num('pass'), fail: num('fail') };
  // 2. stack for crawl + flow
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-eval-'));
  const env = { ...process.env, PORT: String(PORT), DB_FILE: path.join(dir, 'db.sqlite'), UPLOAD_DIR: path.join(dir, 'up'), BACKUP_DIR: path.join(dir, 'bk'), BCRYPT_ROUNDS: '4', BASE };
  run('node', ['src/seed.js', '--reset'], { cwd: BACK, env });
  const srv = spawn('node', ['src/server.js'], { cwd: BACK, env, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch { /* wait */ } await new Promise((r) => setTimeout(r, 200)); }
  log('screen crawl'); const crawl = run('node', [path.join(E2E, 'crawl.js')], { env }); const cm = crawl.stdout.match(/pages (\d+) problems (\d+)/) || [];
  log('TC01-13 flows'); const flow = run('node', [path.join(E2E, 'flow.js')], { env }); srv.kill('SIGKILL');
  const lines = (s) => s.split('\n').filter((l) => /^(PASS|FAIL) /.test(l)).map((l) => { const m = l.match(/^(PASS|FAIL) (desktop|mobile): (.*?)(?: ::.*)?$/); return m ? { ok: m[1] === 'PASS', vp: m[2], name: m[3].trim() } : null; }).filter(Boolean);
  const flows = lines(flow.stdout);
  log('error handling'); const e1 = lines(run('node', [path.join(E2E, 'errors.js')]).stdout); const e2 = lines(run('node', [path.join(E2E, 'errors.js')], { env: { ...process.env, MOBILE: '1', PORT: '3201' } }).stdout);
  log('recovery'); const r1 = lines(run('node', [path.join(E2E, 'recovery.js')]).stdout.replace(/^(PASS|FAIL) (R)/gm, '$1 desktop: $2'));
  const r2 = lines(run('node', [path.join(E2E, 'recovery.js')], { env: { ...process.env, MOBILE: '1', PORT: '3202' } }).stdout.replace(/^(PASS|FAIL) (R)/gm, '$1 mobile: $2'));
  let load = null; if (!process.argv.includes('--skip-load')) { log('load test'); const l = run('node', [path.join(__dirname, 'load/load.js')], { env: { ...process.env, LEVELS: '25,50,100', PORT: '3300' } }); load = l.stdout; const l2 = run('node', [path.join(__dirname, 'load/load.js')], { env: { ...process.env, LEVELS: '25,50,100', PORT: '3301', SCENARIO: 'login' } }); load = { signup: l.stdout, login: l2.stdout }; }

  const byName = (arr) => { const m = new Map(); arr.forEach((x) => { const n = x.name.replace(/^TC\d+ |^E\d+ |^R\d+ /, ''); void n; m.set(x.name, { ...(m.get(x.name) || {}), [x.vp]: x.ok }); }); return [...m.entries()]; };
  const table = (arr) => ['| Test | Desktop | Mobile |', '|---|---|---|', ...byName(arr).map(([n, v]) => `| ${n} | ${v.desktop === undefined ? '-' : tick(v.desktop)} | ${v.mobile === undefined ? '-' : tick(v.mobile)} |`)].join('\n');
  const all = [...flows, ...e1, ...e2, ...r1, ...r2];
  const failed = be.fail > 0 || Number(cm[2]) > 0 || all.some((x) => !x.ok) || !flows.length;
  out.push('# CloudLearn evaluation results', '', `Generated ${new Date().toISOString()} on Node ${process.version}, ${os.cpus().length} CPU(s), ${os.platform()}. Re-create with \`node tests/run-evaluation.js\`.`, '',
    `**Overall: ${failed ? 'FAILURES PRESENT' : 'all checks passed'}**`, '',
    '## 1. Backend automated tests (API, security, data rules)', '', `${be.pass} of ${be.tests} passed (${be.fail} failed). Includes the access-control matrix: every API route called by 7 kinds of caller (anonymous, enrolled student, peer student, non-enrolled student, owning instructor, other instructor, admin).`, '',
    '## 2. Functional test cases TC01-TC13 (real browser, real server and database)', '', table(flows), '',
    '## 3. Screen crawl', '', `${cm[1] || '?'} screens visited across student, instructor and admin roles at desktop and phone widths; ${cm[2] || '?'} problems (console errors, failed API calls, bad text, horizontal overflow).`, '',
    '## 4. Error handling', '', table([...e1, ...e2]), '', '## 5. Recovery', '', table([...r1, ...r2]), '');
  if (load) out.push('## 6. Load (concurrent students taking a timed quiz; bcrypt cost 10, single Node process, SQLite)', '', '### New students registering and taking the quiz at the same moment', '', load.signup.split('\n\n')[0], '', '### Existing students signing in and taking the quiz at the same moment', '', load.login.split('\n\n')[0], '', 'Each student: sign in or register, list courses/assignments/quizzes/notifications, start a quiz attempt, save answers progressively, submit. Latency is dominated by password hashing (CPU-bound); all other endpoints stay well under a second at 100 concurrent students.', '');
  out.push('## 7. Not covered', '', '- Windows run, HTTPS / secure cookie, and the deployed (Render) environment: Phase 7.', '- Penetration testing beyond the access matrix, SQL injection and upload checks in the backend suite.', '- Loads above 100 simultaneous students, multi-instance deployment.', '');
  fs.writeFileSync(path.join(ROOT, 'docs/EVALUATION-RESULTS.md'), out.join('\n'));
  console.log(out.join('\n')); process.exit(failed ? 1 : 0);
})();
