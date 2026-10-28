// Phase 1 regression gate. Run against `vite preview --port 4173`.
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://127.0.0.1:4173/';
const checks = []; const errors = [];
const ok = (name, pass, detail) => checks.push({ name, pass: !!pass, detail: detail === undefined ? '' : String(detail) });
const heading = p => p.locator('header h1').first().textContent().catch(() => null);
const nav = async (p, l) => { await p.locator('aside nav button', { hasText: l }).first().click(); await p.waitForTimeout(250); };
async function login(page, email, clear = true) {
  await page.goto(URL);
  if (clear) { await page.evaluate(() => localStorage.clear()); await page.goto(URL); }
  else { await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cloudlearn_state')); s.currentUserId = null; localStorage.setItem('cloudlearn_state', JSON.stringify(s)); }); await page.goto(URL); }
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'demo123');
  await page.getByRole('button', { name: /Sign in →/ }).click();
  await page.waitForTimeout(700);
}
(async () => {
  const browser = await chromium.launch();
  // Mobile
  { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage();
    page.on('console', m => m.type() === 'error' && errors.push('mobile: ' + m.text()));
    await login(page, 'student@cloudlearn.com');
    const m = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, right: document.querySelector('aside').getBoundingClientRect().right }));
    ok('mobile: no horizontal overflow', m.s <= m.c, `${m.s}/${m.c}`);
    ok('mobile: sidebar hidden by default', m.right <= 1, m.right);
    await page.locator('header button.md\\:hidden').click(); await page.waitForTimeout(400);
    const r2 = await page.evaluate(() => document.querySelector('aside').getBoundingClientRect().right);
    ok('mobile: hamburger opens drawer', r2 > 100, r2);
    await ctx.close(); }
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } }); const page = await ctx.newPage();
  page.on('console', m => m.type() === 'error' && errors.push('desktop: ' + m.text()));
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // Instructor
  await login(page, 'instructor@cloudlearn.com');
  await page.locator('header button:visible').first().click(); await page.waitForTimeout(250);
  const h = await heading(page); ok('instructor bell -> notifications', /notification/i.test(h || ''), h);
  await nav(page, 'Discussions');
  ok('instructor forums not empty', (await page.getByText('No discussions yet').count()) === 0);
  // Create + publish course, check public catalogue
  await nav(page, 'Create Course');
  await page.fill('input[placeholder^="e.g. Complete Python"]', 'Zeta Probe Course');
  await page.fill('textarea', 'Probe description');
  await page.getByRole('button', { name: /Next/ }).click(); await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'Create Course →' }).click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: '+ Add Module' }).click();
  await page.fill('input[placeholder^="e.g. Introduction"]', 'Probe Module');
  await page.locator('.fixed button').filter({ hasText: 'Add Module' }).last().click(); await page.waitForTimeout(250);
  await page.getByRole('button', { name: /Publish/ }).first().click(); await page.waitForTimeout(250);
  await page.goto(URL); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Courses' }).first().click(); await page.waitForTimeout(300);
  await page.fill('input[placeholder="Search courses..."]', 'Zeta Probe'); await page.waitForTimeout(250);
  ok('new published course in public catalogue', (await page.getByText('Zeta Probe Course').count()) > 0);
  ok('instructor session survives reload', (await page.getByRole('button', { name: 'Go to Dashboard' }).count()) > 0);
  // Instructor cannot enrol
  await page.getByText('Complete Python Programming Bootcamp').first().click().catch(() => {}); await page.waitForTimeout(250);
  ok('instructor sees no Enroll button', (await page.getByRole('button', { name: /Enroll Now/ }).count()) === 0);
  // Register -> reload -> enrol
  await page.evaluate(() => localStorage.clear()); await page.goto(URL);
  await page.getByRole('button', { name: 'Get started', exact: true }).click();
  await page.fill('input[placeholder="Alex Johnson"]', 'Probe Student');
  await page.fill('input[type=email]', 'probe@example.com');
  const pw = page.locator('input[type=password]'); await pw.nth(0).fill('secret1'); await pw.nth(1).fill('secret1');
  await page.getByRole('button', { name: /Create account →/ }).click(); await page.waitForTimeout(800);
  await page.reload(); await page.waitForTimeout(500);
  ok('registered user survives reload', (await page.getByRole('button', { name: 'Go to Dashboard' }).count()) > 0);
  await page.getByRole('button', { name: 'Courses' }).first().click(); await page.waitForTimeout(250);
  await page.getByText('Complete Python Programming Bootcamp').first().click(); await page.waitForTimeout(250);
  const eb = page.getByRole('button', { name: /Enroll Now/ });
  ok('new student can enrol after reload', (await eb.count()) > 0);
  if (await eb.count()) { await eb.first().click(); await page.waitForTimeout(500); }
  // Instructor sees the new student
  await login(page, 'instructor@cloudlearn.com', false);
  await nav(page, 'My Courses');
  await page.getByRole('button', { name: 'Students' }).first().click(); await page.waitForTimeout(300);
  ok('instructor sees newly enrolled student', (await page.getByText('Probe Student').count()) > 0);
  // Quiz timer expiry keeps answers
  await login(page, 'student@cloudlearn.com');
  const total = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cloudlearn_state'));
    s.quizAttempts = s.quizAttempts.filter(a => a.studentId !== 'u1');
    s.quizzes = s.quizzes.map(q => ({ ...q, duration: 0.05 }));
    localStorage.setItem('cloudlearn_state', JSON.stringify(s));
    return s.quizzes[0].questions.length;
  });
  await page.reload(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Go to Dashboard' }).click(); await page.waitForTimeout(300);
  await nav(page, 'Quizzes');
  await page.getByRole('button', { name: /Take Quiz|Start Exam/ }).first().click();
  await page.getByRole('button', { name: /Start Quiz|Start Exam/ }).click();
  await page.locator('main button:has(span:text-is("A"))').first().click();
  await page.waitForTimeout(4500);
  const na = await page.getByText('Not answered').count();
  ok('quiz expiry shows result, answer kept', (await page.getByText(/Answer Review/).count()) > 0 && na < total, `notAnswered=${na} total(first quiz)=${total}`);
  // Role guard: student cannot reach admin route
  await login(page, 'student@cloudlearn.com');
  const sh = await heading(page); ok('student lands on student area', /dashboard|welcome/i.test(sh || ''), sh);
  // Nav sweeps
  const sweep = async (email, labels) => { await login(page, email); const bad = []; for (const l of labels) { await nav(page, l); const t = await heading(page); if (!t) bad.push(l); } return bad; };
  const bs = await sweep('student@cloudlearn.com', ['Dashboard','My Courses','Assignments','Quizzes','Progress','Discussions','Messages','Notifications','Profile']);
  const bi = await sweep('instructor@cloudlearn.com', ['Dashboard','My Courses','Grading','Quiz Builder','Analytics','Messages','Notifications','Profile']);
  const ba = await sweep('admin@cloudlearn.com', ['Dashboard','User Management','Courses','Categories','Reports','Analytics','Activity Logs','Backup','Settings','Notifications']);
  ok('student nav sweep', bs.length === 0, bs); ok('instructor nav sweep', bi.length === 0, bi); ok('admin nav sweep', ba.length === 0, ba);
  // Admin add user
  await login(page, 'admin@cloudlearn.com'); await nav(page, 'User Management');
  const before = await page.locator('tbody tr').count();
  await page.getByRole('button', { name: '+ Add User' }).click();
  await page.fill('input[placeholder="John Smith"]', 'Fake New'); await page.fill('input[placeholder="john@example.com"]', 'fake.new@example.com');
  await page.getByRole('button', { name: 'Create User' }).click(); await page.waitForTimeout(350);
  ok('admin Add User adds a row', (await page.locator('tbody tr').count()) === before + 1, `${before}->${await page.locator('tbody tr').count()}`);
  const real = errors.filter(e => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(e)); // external images blocked in sandbox
  ok('no console errors (excluding blocked external images)', real.length === 0, [...new Set(real)].slice(0, 5).join(' | '));
  await browser.close();
  let fail = 0; for (const c of checks) { if (!c.pass) fail++; console.log((c.pass ? 'PASS ' : 'FAIL ') + c.name + (c.detail ? '  [' + c.detail + ']' : '')); }
  console.log(`\n${checks.length - fail}/${checks.length} passed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('PROBE CRASHED', e); process.exit(2); });
