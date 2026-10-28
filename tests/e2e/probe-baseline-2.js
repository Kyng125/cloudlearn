const { chromium } = require('playwright');
const OUT = '/tmp/claude-0/-home-claude/635bf5b9-38c8-581a-87af-5d0281fdbc19/scratchpad/tests';
const URL = 'http://127.0.0.1:4173/';
const R = {};
async function login(page, email, pw='demo123') {
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', pw);
  await page.getByRole('button', { name: /Sign in →/ }).click(); await page.waitForTimeout(700);
}
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1366, height: 800 } })).newPage();
  await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.goto(URL);

  // A. instructor creates + publishes a course; check state
  await login(page, 'instructor@cloudlearn.com');
  await page.locator('aside nav button', { hasText: 'Create Course' }).click();
  await page.fill('input[placeholder^="e.g. Complete Python"]', 'Zeta Probe Course');
  await page.fill('textarea', 'Probe description');
  await page.getByRole('button', { name: /Next/ }).click(); await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'Create Course →' }).click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Publish/ }).first().click(); await page.waitForTimeout(300);
  R.stateHasPublishedNewCourse = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cloudlearn_state'));
    const c = s.courses.find(c => c.title === 'Zeta Probe Course'); return c ? { isPublished: c.isPublished } : null; });
  R.editPageTextInputs = await page.locator('input[type=text], input:not([type])').count(); // no metadata editing fields
  // go to public catalogue without reload (in-memory state, route change only)
  await page.locator('aside nav button', { hasText: 'My Courses' }).click();
  await page.getByRole('button', { name: 'Logout' }).count();
  await page.locator('aside button[title=Logout]').click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Courses' }).first().click(); await page.waitForTimeout(300);
  R.catalogCountText = await page.locator('p', { hasText: 'courses available' }).first().textContent();
  await page.fill('input[placeholder="Search courses..."]', 'Zeta'); await page.waitForTimeout(200);
  R.zetaVisibleInCatalog = await page.getByText('Zeta Probe Course').count();

  // B. new student registers (no reload), enrols in seeded course, instructor then looks
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.fill('input[placeholder="Alex Johnson"]', 'Probe Student');
  await page.fill('input[type=email]', 'probe@example.com');
  const pw = page.locator('input[type=password]'); await pw.nth(0).fill('secret1'); await pw.nth(1).fill('secret1');
  await page.getByRole('button', { name: /Create account →/ }).click(); await page.waitForTimeout(800);
  await page.locator('aside nav button', { hasText: 'My Courses' }).click();
  await page.getByRole('button', { name: 'Browse More' }).click(); await page.waitForTimeout(300);
  await page.getByText('Complete Python Programming Bootcamp').first().click(); await page.waitForTimeout(300);
  await page.locator('.sticky button').first().click(); await page.waitForTimeout(700);
  R.newStudentEnrolledOk = await page.getByText('Course not found').count() === 0;
  // post a discussion as new student
  await page.locator('aside nav button', { hasText: 'Discussions' }).click();
  await page.getByRole('button', { name: '+ New Thread' }).click();
  await page.locator('select').selectOption({ index: 1 });
  await page.fill('input[placeholder^="What"]', 'Probe thread'); await page.fill('textarea', 'body');
  await page.getByRole('button', { name: 'Post Thread' }).click(); await page.waitForTimeout(400);
  R.threadAuthorLineHasBlankName = await page.locator('text=/^ ·|^\\s*·/').count();
  await page.screenshot({ path: OUT + '/new-student-discussion.png' });
  await page.locator('aside button[title=Logout]').click(); await page.waitForTimeout(400);
  await login(page, 'instructor@cloudlearn.com');
  await page.locator('aside nav button', { hasText: 'My Courses' }).click(); await page.waitForTimeout(300);
  R.instructorCourseCardStudentCount = await page.locator('text=/\\d+ students/').allTextContents();
  await page.getByRole('button', { name: 'Students' }).first().click(); await page.waitForTimeout(300);
  R.instructorSeesProbeStudent = await page.getByText('Probe Student').count();
  R.instructorStateSeesEnrollment = await page.evaluate(() => JSON.parse(localStorage.getItem('cloudlearn_state')).enrollments.length);

  // C. quiz timeout
  await page.locator('aside button[title=Logout]').click(); await page.waitForTimeout(300);
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cloudlearn_state'));
    s.quizAttempts = s.quizAttempts.filter(a => a.studentId !== 'u1'); s.quizzes = s.quizzes.map(q => ({...q, duration: 0.05}));
    localStorage.setItem('cloudlearn_state', JSON.stringify(s)); });
  await page.reload(); await page.waitForTimeout(400);
  await login(page, 'student@cloudlearn.com');
  await page.locator('aside nav button', { hasText: 'Quizzes' }).click();
  await page.getByRole('button', { name: /Take Quiz|Start Exam/ }).first().click(); await page.waitForTimeout(200);
  await page.getByRole('button', { name: /^Start (Quiz|Exam)$/ }).click(); await page.waitForTimeout(300);
  // click option for each question until last (choose option index 0 = A), no manual submit
  const opts = page.locator('button.w-full.flex.items-center.gap-3.p-4');
  R.optionButtons = await opts.count();
  await opts.first().click();
  R.answeredBeforeTimeout = await page.locator('text=/\\d+\\/\\d+ answered/').textContent();
  await page.waitForTimeout(4500);
  R.afterTimeoutText = (await page.locator('main').innerText()).replace(/\n+/g, ' | ').slice(0, 400);
  await page.screenshot({ path: OUT + '/quiz-timeout2.png' });
  console.log(JSON.stringify(R, null, 2));
  await b.close();
})().catch(e => { console.error('FAIL', e.message.slice(0, 500)); process.exit(1); });
