// Phase 6d: concurrent students taking a timed quiz. Own backend, temp DB, production-like bcrypt cost.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');
const BACK = path.resolve(__dirname, '../../backend'); const PORT = process.env.PORT || 3300; const BASE = `http://127.0.0.1:${PORT}`;
const LEVELS = (process.env.LEVELS || '25,50,100').split(',').map(Number);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-load-'));
const env = { ...process.env, PORT: String(PORT), DB_FILE: path.join(dir, 'db.sqlite'), UPLOAD_DIR: path.join(dir, 'up'), BACKUP_DIR: path.join(dir, 'bk'), NODE_ENV: '' };
delete env.BCRYPT_ROUNDS; // default cost, like production
let srv;
const up = async () => { srv = spawn('node', ['src/server.js'], { cwd: BACK, env, stdio: 'ignore' }); for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + '/api/health')).ok) return; } catch {} await new Promise(r => setTimeout(r, 100)); } throw new Error('no server'); };
const pct = (a, p) => a.length ? a.sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function user(i, run, lat, errs) {
  let cookie = '';
  const call = async (label, method, p, body) => {
    const t = performance.now(); let status = 0, json = null;
    try { const r = await fetch(BASE + p, { method, headers: { 'content-type': 'application/json', origin: BASE, ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); status = r.status; const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; json = await r.json().catch(() => null); }
    catch (e) { status = 0; errs.push('fetch-error ' + (e.cause && e.cause.code || e.message)); }
    (lat[label] ||= []).push(performance.now() - t); if (status < 200 || status >= 300) errs.push(`${label} ${status}`); return { status, json };
  };
  const email = `load_${run}_${i}@example.com`;
  if (process.env.SCENARIO === 'login') { await call('login', 'POST', '/api/auth/login', { email, password: 'secret12' }); }
  else { await call('register', 'POST', '/api/auth/register', { name: `Load ${i}`, email, password: 'secret12' }); await call('enroll', 'POST', '/api/courses/c1/enroll'); }
  await sleep(Math.random() * 300);
  await call('list courses', 'GET', '/api/courses'); await call('list assignments', 'GET', '/api/assignments'); await call('list quizzes', 'GET', '/api/quizzes'); await call('notifications', 'GET', '/api/notifications');
  const st = await call('start attempt', 'POST', '/api/quizzes/qz1/attempts');
  const att = st.json && st.json.attempt; const qs = (st.json && st.json.questions) || [];
  if (att) {
    const answers = qs.map(() => -1);
    for (let q = 0; q < qs.length; q++) { await sleep(100 + Math.random() * 300); answers[q] = Math.floor(Math.random() * 4); await call('save answers', 'PUT', `/api/attempts/${att.id}/answers`, { answers }); }
    await call('submit attempt', 'POST', `/api/attempts/${att.id}/submit`, { answers });
  }
  await call('list threads', 'GET', '/api/threads');
}

(async () => {
  spawnSync('node', ['src/seed.js', '--reset'], { cwd: BACK, env, stdio: 'ignore' }); await up();
  const rows = []; let failed = false;
  for (const n of LEVELS) {
    const run = `${n}_${Date.now()}`;
    if (process.env.SCENARIO === 'login') { // accounts already exist and are enrolled: a class signing in together
      for (let i = 0; i < n; i++) { const r = await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE }, body: JSON.stringify({ name: `Load ${i}`, email: `load_${run}_${i}@example.com`, password: 'secret12' }) }); const c = r.headers.get('set-cookie').split(';')[0]; await fetch(BASE + '/api/courses/c1/enroll', { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, cookie: c }, body: '{}' }); }
    }
    const lat = {}, errs = []; const t0 = performance.now();
    await Promise.all(Array.from({ length: n }, (_, i) => user(i, run, lat, errs)));
    const secs = (performance.now() - t0) / 1000; const all = Object.values(lat).flat();
    const health = await fetch(BASE + '/api/health').then(r => r.ok).catch(() => false);
    rows.push({ n, requests: all.length, secs, rps: all.length / secs, p50: pct(all.slice(), .5), p95: pct(all.slice(), .95), max: Math.max(...all), errors: errs.length, errKinds: Object.entries(errs.reduce((m, e) => (m[e] = (m[e] || 0) + 1, m), {})).map(([k, v]) => k + ' x' + v), per: Object.fromEntries(Object.entries(lat).map(([k, v]) => [k, { n: v.length, p50: pct(v.slice(), .5), p95: pct(v.slice(), .95) }])), health });
    if (errs.length || !health) failed = true;
  }
  const attempts = spawnSync('node', ['-e', `const D=require('better-sqlite3');const d=new D('${env.DB_FILE}',{readonly:true});console.log(JSON.stringify(d.prepare("select count(*) n, sum(case when completed_at is not null then 1 else 0 end) done from attempts where student_id in (select id from users where email like 'load_%')").get()))`], { cwd: BACK, encoding: 'utf8' }).stdout.trim();
  console.log('| Concurrent students | Requests | Duration (s) | Req/s | p50 (ms) | p95 (ms) | Max (ms) | Errors |\n|---|---|---|---|---|---|---|---|');
  rows.forEach(r => console.log(`| ${r.n} | ${r.requests} | ${r.secs.toFixed(1)} | ${r.rps.toFixed(0)} | ${r.p50.toFixed(0)} | ${r.p95.toFixed(0)} | ${r.max.toFixed(0)} | ${r.errors}${r.errKinds.length ? ' (' + r.errKinds.join(', ') + ')' : ''} |`));
  const last = rows[rows.length - 1]; console.log('\nSlowest endpoints at the highest level (p95 ms):'); Object.entries(last.per).sort((a, b) => b[1].p95 - a[1].p95).slice(0, 4).forEach(([k, v]) => console.log(`  ${k}: ${v.p95.toFixed(0)} (n=${v.n})`));
  console.log('\nAttempts recorded in DB:', attempts); fs.writeFileSync(path.join(__dirname, 'last-result.json'), JSON.stringify({ when: new Date().toISOString(), node: process.version, cpus: os.cpus().length, rows }, null, 1));
  srv.kill('SIGKILL'); process.exit(failed ? 1 : 0);
})().catch(e => { console.log('CRASH', e.message); try { srv.kill('SIGKILL'); } catch {} process.exit(2); });
