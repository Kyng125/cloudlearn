#!/usr/bin/env node
// Post-deploy smoke test. Read-only apart from sign-in/out and two deliberately failed logins.
//   node tests/smoke-live.js https://your-app.onrender.com admin@example.com 'admin-password'
const [base0, adminEmail, adminPw] = process.argv.slice(2);
if (!base0 || !adminEmail || !adminPw) { console.error('usage: node tests/smoke-live.js <base-url> <admin-email> <admin-password>'); process.exit(2); }
const BASE = base0.replace(/\/+$/, ''); const https = BASE.startsWith('https://');
const results = []; const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' (' + detail + ')' : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, { body, cookie, origin } = {}) {
  const r = await fetch(BASE + p, { method, redirect: 'manual', signal: AbortSignal.timeout(90000), headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...(origin ? { origin } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch { /* html */ } return { status: r.status, headers: r.headers, text, json };
}
(async () => {
  // Wake the service (Render free plan can take about a minute).
  let health, t0 = Date.now();
  for (let i = 0; i < 6; i++) { try { health = await call('GET', '/api/health'); if (health.status === 200) break; } catch { /* waking */ } await sleep(10000); }
  check('service responds', !!health && health.status === 200, `${Math.round((Date.now() - t0) / 1000)} s to first answer`);
  if (!health || health.status !== 200) process.exit(1);
  check('health reports ok', health.json && health.json.ok === true, `ephemeral=${health.json.ephemeral} started=${health.json.startedAt}`);
  const page = await call('GET', '/');
  check('home page is HTML with a real title', page.status === 200 && /<title>CloudLearn/.test(page.text) && !/figma:/.test(page.text));
  const spa = await call('GET', '/student/anything'); check('unknown page path falls back to the app', spa.status === 200 && /<div id="root">/.test(spa.text));
  const h = page.headers;
  check('Content-Security-Policy present', /default-src 'self'/.test(h.get('content-security-policy') || ''));
  check('X-Content-Type-Options nosniff', h.get('x-content-type-options') === 'nosniff'); check('clickjacking blocked (X-Frame-Options)', h.get('x-frame-options') === 'DENY');
  if (https) check('HSTS header present', /max-age=\d+/.test(h.get('strict-transport-security') || '')); else console.log('SKIP HSTS and Secure-cookie checks (URL is not https)');
  check('API requires sign-in (courses)', (await call('GET', '/api/courses')).status === 401); check('API requires sign-in (admin users)', (await call('GET', '/api/admin/users')).status === 401);
  check('unknown e-mail is refused', (await call('POST', '/api/auth/login', { body: { email: 'nobody-smoke@example.com', password: 'x-wrong-1' } })).status === 401);
  check('the public demo password does not open the admin account', (await call('POST', '/api/auth/login', { body: { email: adminEmail, password: 'demo123' } })).status === 401);
  const login = await call('POST', '/api/auth/login', { body: { email: adminEmail, password: adminPw } });
  check('admin can sign in', login.status === 200 && login.json && login.json.user.role === 'admin', `status ${login.status}`);
  if (login.status !== 200) process.exit(1);
  const sc = login.headers.get('set-cookie') || ''; const cookie = sc.split(';')[0];
  check('session cookie is HttpOnly and SameSite', /HttpOnly/i.test(sc) && /SameSite=Lax/i.test(sc)); if (https) check('session cookie is Secure', /;\s*Secure/i.test(sc));
  check('admin can read users', (await call('GET', '/api/admin/users', { cookie })).status === 200); check('admin can read a report', (await call('GET', '/api/reports/users', { cookie })).status === 200);
  check('cross-site write is refused', (await call('POST', '/api/auth/logout', { cookie, origin: 'https://evil.example' })).status === 403);
  check('sign-out ends the session', (await call('POST', '/api/auth/logout', { cookie })).status === 200 && (await call('GET', '/api/auth/me', { cookie })).status === 401);
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`); process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('CRASH', e.message); process.exit(2); });
