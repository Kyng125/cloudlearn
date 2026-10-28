// Read-only behavioural probe of the Figma-generated CloudLearn build (scratch copy).
const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/635bf5b9-38c8-581a-87af-5d0281fdbc19/scratchpad/tests';
const URL = 'http://127.0.0.1:4173/';
const results = {};
const consoleErrors = [];

async function login(page, email) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'demo123');
  await page.getByRole('button', { name: /Sign in →/ }).click();
  await page.waitForTimeout(800);
}
async function nav(page, label) {
  await page.locator('aside nav button', { hasText: label }).first().click();
  await page.waitForTimeout(300);
}
const heading = async (page) => (await page.locator('header h1').first().textContent().catch(() => null));

(async () => {
  const browser = await chromium.launch();

  // ---------- 1. Mobile layout (390px) ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push('mobile: ' + m.text()); });
    await login(page, 'student@cloudlearn.com');
    const m = await page.evaluate(() => {
      const aside = document.querySelector('aside');
      const main = document.querySelector('main');
      return {
        asideWidth: aside ? Math.round(aside.getBoundingClientRect().width) : null,
        asideVisible: aside ? getComputedStyle(aside).display !== 'none' : null,
        mainPadLeft: main ? getComputedStyle(main).paddingLeft : null,
        contentWidth: main ? Math.round(main.getBoundingClientRect().width - parseFloat(getComputedStyle(main).paddingLeft)) : null,
        scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      };
    });
    results.mobile = m;
    await page.screenshot({ path: OUT + '/mobile-student.png' });
    // does hamburger actually open/close a drawer?
    const before = await page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    await page.locator('header button.md\\:hidden').click().catch(() => {});
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => Math.round(document.querySelector('aside').getBoundingClientRect().width));
    results.mobile.hamburgerChangesSidebar = before !== after;
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('desktop: ' + m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  // ---------- 2. Instructor bell -> admin page ----------
  await login(page, 'instructor@cloudlearn.com');
  results.instructorLanding = await heading(page);
  await page.locator('header button:visible').first().click(); // bell
  await page.waitForTimeout(300);
  results.instructorBellGoesTo = await heading(page);
  await page.screenshot({ path: OUT + '/instructor-bell.png' });

  // ---------- 3. Instructor discussions ----------
  await nav(page, 'Discussions');
  results.instructorDiscussionsEmpty = await page.getByText('No discussions yet').count();

  // ---------- 4. Instructor sidebar has no notifications entry ----------
  results.instructorNavItems = await page.locator('aside nav button').allTextContents();

  // ---------- 5. Create course -> publish -> visible publicly? ----------
  await nav(page, 'Create Course');
  await page.fill('input[placeholder^="e.g. Complete Python"]', 'Zeta Probe Course');
  await page.fill('textarea', 'Probe description');
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'Create Course →' }).click();
  await page.waitForTimeout(500);
  // add module + lesson, publish
  await page.getByRole('button', { name: '+ Add Module' }).click();
  await page.fill('input[placeholder^="e.g. Introduction"]', 'Probe Module');
  await page.locator('div[role=dialog] button, .fixed button').filter({ hasText: 'Add Module' }).last().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Publish/ }).first().click();
  await page.waitForTimeout(300);
  results.editCourseHasTitleEditor = await page.locator('input[value="Zeta Probe Course"]').count();
  // go public catalog
  await page.goto(URL); // state restored from localStorage, route resets
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Courses' }).first().click();
  await page.waitForTimeout(400);
  await page.fill('input[placeholder="Search courses..."]', 'Zeta Probe');
  await page.waitForTimeout(300);
  results.newPublishedCourseInPublicCatalog = await page.getByText('Zeta Probe Course').count();
  results.persistedStillLoggedIn = await page.getByRole('button', { name: 'Go to Dashboard' }).count();

  // ---------- 6. Register -> reload ----------
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL);
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.fill('input[placeholder="Alex Johnson"]', 'Probe Student');
  await page.fill('input[type=email]', 'probe@example.com');
  const pw = page.locator('input[type=password]');
  await pw.nth(0).fill('secret1'); await pw.nth(1).fill('secret1');
  await page.getByRole('button', { name: /Create account →/ }).click();
  await page.waitForTimeout(900);
  results.registeredLanding = await heading(page);
  await page.reload(); await page.waitForTimeout(600);
  results.afterReloadShowsGoToDashboard = await page.getByRole('button', { name: 'Go to Dashboard' }).count();
  // enrol this new student into seeded course c1 then check instructor student list
  await page.getByRole('button', { name: 'Courses' }).first().click();
  await page.waitForTimeout(300);
  await page.getByText('Complete Python Programming Bootcamp').first().click();
  await page.waitForTimeout(300);
  results.enrollButtonTextAfterReload = await page.locator('.sticky button').first().textContent().catch(() => null);
  if (/Enroll Now|Continue/.test(results.enrollButtonTextAfterReload || '')) {
    await page.locator('.sticky button').first().click();
    await page.waitForTimeout(600);
    results.newStudentSeesCourse = await page.getByText('Course not found').count() === 0;
  }

  // ---------- 7. Seed dates: assignments pending? ----------
  await login(page, 'student@cloudlearn.com');
  await nav(page, 'Assignments');
  const tabs = await page.locator('button', { hasText: /^(Pending|Submitted|Graded|Overdue)/ }).allTextContents();
  results.studentAssignmentTabs = tabs;

  // ---------- 8. Quiz: timer expiry loses answers? ----------
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cloudlearn_state'));
    s.quizAttempts = s.quizAttempts.filter(a => a.studentId !== 'u1');
    s.quizzes = s.quizzes.map(q => ({ ...q, duration: 0.05 })); // 3 seconds
    localStorage.setItem('cloudlearn_state', JSON.stringify(s));
  });
  await page.reload(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();
  await page.waitForTimeout(400);
  await nav(page, 'Quizzes');
  await page.getByRole('button', { name: /Take Quiz|Start Exam/ }).first().click();
  await page.getByRole('button', { name: /Start Quiz|Start Exam/ }).click();
  // answer Q1 correctly? just pick the right one by reading nothing: pick A for each question, click through
  await page.locator('button:has(span:text("A"))').first().click();
  await page.waitForTimeout(4500);
  results.quizAfterTimeout = (await page.locator('text=/Answer Review|Not answered/').count()) > 0
    ? await page.locator('.font-display.text-6xl, div.text-6xl').first().textContent().catch(() => null) : 'no result screen';
  results.quizNotAnsweredLabelCount = await page.getByText('Not answered').count();
  await page.screenshot({ path: OUT + '/quiz-timeout.png' });

  // ---------- 9. Console errors / dead nav sweep per role ----------
  const sweep = async (email, labels) => {
    await login(page, email);
    const seen = [];
    for (const l of labels) { await nav(page, l); seen.push(l + ' -> ' + (await heading(page))); }
    return seen;
  };
  results.sweepStudent = await sweep('student@cloudlearn.com', ['Dashboard','My Courses','Assignments','Quizzes','Progress','Discussions','Messages','Notifications','Profile']);
  results.sweepInstructor = await sweep('instructor@cloudlearn.com', ['Dashboard','My Courses','Grading','Quiz Builder','Analytics','Messages','Profile']);
  results.sweepAdmin = await sweep('admin@cloudlearn.com', ['Dashboard','User Management','Courses','Categories','Reports','Analytics','Activity Logs','Backup','Settings']);

  // ---------- 10. Admin: Add user creates nothing ----------
  await login(page, 'admin@cloudlearn.com');
  await nav(page, 'User Management');
  const before = await page.locator('tbody tr').count();
  await page.getByRole('button', { name: '+ Add User' }).click();
  await page.fill('input[placeholder="John Smith"]', 'Fake New');
  await page.fill('input[placeholder="john@example.com"]', 'fake.new@example.com');
  await page.getByRole('button', { name: 'Create User' }).click();
  await page.waitForTimeout(400);
  results.adminAddUserRowsBeforeAfter = [before, await page.locator('tbody tr').count()];

  // ---------- 11. Instructor Student Management filter dropdown wired? ----------
  await login(page, 'instructor@cloudlearn.com');
  await nav(page, 'My Courses');
  await page.getByRole('button', { name: 'Students' }).first().click();
  await page.waitForTimeout(300);
  const rowsAll = await page.locator('tbody tr').count();
  await page.locator('select').selectOption({ index: 2 }).catch(() => {});
  await page.waitForTimeout(200);
  results.studentMgmtFilterRows = [rowsAll, await page.locator('tbody tr').count()];

  results.consoleErrors = [...new Set(consoleErrors)].slice(0, 12);
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
