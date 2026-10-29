const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { start, Client, asUser, USERS, files } = require('./helpers');

const U = (s, k) => asUser(s.base, USERS[k]);
async function newPublishedCourse(ins, title = 'Test Course') {
  const c = (await ins.post('/api/courses', { title, description: 'd', category: 'Testing', level: 'Beginner' })).json.course;
  await ins.patch(`/api/courses/${c.id}`, { isPublished: true });
  return c;
}

// ---------------- TC04 Course management (FR4, FR5) ----------------
test('TC04: instructor creates a course and uploads a material; an enrolled student retrieves identical bytes', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const created = await ins.post('/api/courses', { title: 'Networks Lab', description: 'x', category: 'Networking', level: 'Intermediate' });
  assert.equal(created.status, 201); assert.equal(created.json.course.isPublished, false);
  assert.equal(s.db.prepare('SELECT instructor_id FROM courses WHERE id=?').get(created.json.course.id).instructor_id, s.db.prepare("SELECT id FROM users WHERE email=?").get(USERS.ins1).id);
  const cid = created.json.course.id;
  const mod = await ins.post(`/api/courses/${cid}/modules`, { title: 'Week 1' });
  const les = await ins.post(`/api/modules/${mod.json.module.id}/lessons`, { title: 'Intro', type: 'video', content: 'https://example.com/v', durationMinutes: 12 });
  assert.equal(les.status, 201);
  const bytes = Buffer.from('hello cloud material');
  const up = await ins.upload(`/api/courses/${cid}/materials`, {}, 'notes.txt', bytes);
  assert.equal(up.status, 201); assert.equal(up.json.material.fileName, 'notes.txt');
  const row = s.db.prepare('SELECT * FROM materials WHERE id=?').get(up.json.material.id);
  assert.ok(fs.existsSync(path.join(s.uploadDir, row.stored_name)), 'file stored on disk');
  assert.notEqual(row.stored_name, 'notes.txt');                         // stored under a generated name
  await ins.patch(`/api/courses/${cid}`, { isPublished: true });
  assert.equal((await stu.post(`/api/courses/${cid}/enroll`)).status, 201);
  const dl = await fetch(`${s.base}/api/materials/${up.json.material.id}/download`, { headers: { cookie: stu.cookie } });
  assert.equal(dl.status, 200); assert.deepEqual(Buffer.from(await dl.arrayBuffer()), bytes);
  assert.match(dl.headers.get('content-disposition'), /attachment/);
  assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
  await s.close();
});

test('TC04: materials are closed to non-enrolled students, anonymous users and other instructors', async () => {
  const s = await start(); const ins = await U(s, 'ins1');
  const up = await ins.upload('/api/courses/c1/materials', {}, 'a.pdf', 'pdfdata');
  assert.equal(up.status, 201); const mid = up.json.material.id;
  const outsider = await U(s, 'stu5');                                  // not enrolled in c1
  assert.equal((await outsider.get('/api/courses/c1/materials')).status, 403);
  assert.equal((await outsider.get(`/api/materials/${mid}/download`)).status, 403);
  assert.equal((await new Client(s.base).get(`/api/materials/${mid}/download`)).status, 401);
  assert.equal((await (await U(s, 'stu2')).get(`/api/materials/${mid}/download`)).status, 200);  // enrolled
  const other = await U(s, 'ins2');
  assert.equal((await other.get('/api/courses/c1/materials')).status, 403);
  assert.equal((await other.del(`/api/materials/${mid}`)).status, 403);
  await s.close();
});

test('TC04: unauthorised uploads are refused BEFORE anything is written to disk', async () => {
  const s = await start(); const before = files(s.uploadDir).length;
  assert.equal((await (await U(s, 'ins2')).upload('/api/courses/c1/materials', {}, 'x.txt', 'data')).status, 403);   // not the owner
  assert.equal((await (await U(s, 'stu2')).upload('/api/courses/c1/materials', {}, 'x.txt', 'data')).status, 403);  // student
  assert.equal((await new Client(s.base).upload('/api/courses/c1/materials', {}, 'x.txt', 'data')).status, 401);
  assert.equal(files(s.uploadDir).length, before);
  await s.close();
});

test('TC04: upload validation (type, size, missing file, hostile file names)', async () => {
  const s = await start({ config: { maxUploadBytes: 1024 } }); const ins = await U(s, 'ins1');
  assert.equal((await ins.upload('/api/courses/c1/materials', {}, 'run.exe', 'MZ')).status, 400);
  assert.equal((await ins.upload('/api/courses/c1/materials', {}, 'big.txt', Buffer.alloc(5000))).status, 413);
  assert.equal((await ins.upload('/api/courses/c1/materials', {}, null)).status, 400);
  assert.equal(files(s.uploadDir).length, 0, 'rejected uploads leave no files');
  const ok = await ins.upload('/api/courses/c1/materials', {}, '../../etc/passwd.txt', 'x');
  assert.equal(ok.status, 201); assert.equal(ok.json.material.fileName, 'passwd.txt');
  const stored = s.db.prepare('SELECT stored_name FROM materials').get().stored_name;
  assert.ok(path.resolve(s.uploadDir, stored).startsWith(path.resolve(s.uploadDir)));
  await s.close();
});

test('TC04: role rules, draft visibility and lesson-content protection', async () => {
  const s = await start(); const stu = await U(s, 'stu5'), ins = await U(s, 'ins1'), admin = await U(s, 'admin');
  assert.equal((await stu.post('/api/courses', { title: 'Nope' })).status, 403);
  assert.equal((await ins.post('/api/courses', { title: '' })).status, 400);
  assert.equal((await ins.post('/api/courses', { title: 'x', level: 'Expert' })).status, 400);
  assert.equal((await admin.post('/api/courses', { title: 'Admin made' })).status, 400);                 // needs an instructor
  assert.equal((await admin.post('/api/courses', { title: 'Admin made', instructorId: 'u_ins2' })).status, 201);
  const pub = (await new Client(s.base).get('/api/public/courses')).json.courses;
  assert.ok(pub.length >= 4 && pub.every((c) => c.isPublished) && !pub.some((c) => c.id === 'c5'));
  assert.equal((await stu.get('/api/courses/c5')).status, 404);                                          // draft hidden
  assert.equal((await ins.get('/api/courses/c5')).status, 404);                                          // not ins1's draft
  assert.equal((await (await U(s, 'ins2')).get('/api/courses/c5')).status, 200);
  const notEnrolled = (await stu.get('/api/courses/c1')).json.course;                                    // ngozi not in c1
  assert.ok(notEnrolled.modules[0].lessons.every((l) => l.content === ''));
  const enrolled = (await (await U(s, 'stu2')).get('/api/courses/c1')).json.course;
  assert.ok(enrolled.modules[0].lessons.every((l) => l.content.length > 0));
  assert.equal((await ins.del('/api/courses/c1')).status, 409);                                          // has enrolments
  await s.close();
});

test('TC04: a non-owner cannot edit another instructor\'s course, modules or lessons', async () => {
  const s = await start(); const other = await U(s, 'ins2');
  assert.equal((await other.patch('/api/courses/c1', { title: 'Hijacked' })).status, 403);
  assert.equal((await other.post('/api/courses/c1/modules', { title: 'Evil' })).status, 403);
  assert.equal((await other.patch('/api/modules/c1_m1', { title: 'Evil' })).status, 403);
  assert.equal((await other.del('/api/lessons/c1_m1_l1')).status, 403);
  assert.equal(s.db.prepare("SELECT title FROM courses WHERE id='c1'").get().title, 'Programming Fundamentals with Python');
  await s.close();
});

// ---------------- TC05 Enrolment (FR6) ----------------
test('TC05: a student enrols; the record is written and materials become accessible', async () => {
  const s = await start(); const ins2 = await U(s, 'ins2'), stu = await U(s, 'stu2');   // chidi is not in c3
  const mid = (await ins2.upload('/api/courses/c3/materials', {}, 'week1.txt', 'content')).json.material.id;
  assert.equal((await stu.get(`/api/materials/${mid}/download`)).status, 403);
  const e = await stu.post('/api/courses/c3/enroll');
  assert.equal(e.status, 201); assert.equal(e.json.enrollment.courseId, 'c3');
  const uid = s.db.prepare('SELECT id FROM users WHERE email=?').get(USERS.stu2).id;
  assert.ok(s.db.prepare('SELECT 1 FROM enrollments WHERE student_id=? AND course_id=?').get(uid, 'c3'), 'enrolment row written');
  assert.equal((await stu.get(`/api/materials/${mid}/download`)).status, 200);
  assert.equal((await stu.get('/api/courses/c3/materials')).json.materials.length, 1);
  assert.ok((await ins2.get('/api/notifications')).json.notifications.some((n) => n.type === 'enrollment'));
  await s.close();
});

test('TC05: duplicate, unpublished and non-student enrolment are refused', async () => {
  const s = await start(); const stu = await U(s, 'stu1');
  assert.equal((await stu.post('/api/courses/c1/enroll')).status, 409);                  // already enrolled
  assert.equal((await stu.post('/api/courses/c5/enroll')).status, 404);                  // draft course
  assert.equal((await (await U(s, 'ins1')).post('/api/courses/c3/enroll')).status, 403);
  assert.equal((await (await U(s, 'admin')).post('/api/courses/c3/enroll')).status, 403);
  assert.equal((await new Client(s.base).post('/api/courses/c3/enroll')).status, 401);
  await s.close();
});

test('TC05: lesson progress is tracked per enrolled student and is idempotent', async () => {
  const s = await start(); const stu = await U(s, 'stu2');
  const total = 4, before = (await stu.get('/api/courses/c1/progress')).json;
  assert.equal(before.totalLessons, total); assert.equal(before.completedLessons.length, 1);   // seeded: one lesson done
  const a = await stu.post('/api/lessons/c1_m2_l2/complete'); const b = await stu.post('/api/lessons/c1_m2_l2/complete');
  assert.equal(a.status, 200); assert.equal(b.json.completedLessons.length, 2); assert.equal(b.json.progress, 50);
  assert.equal((await (await U(s, 'stu5')).post('/api/lessons/c1_m2_l2/complete')).status, 403);   // not enrolled
  const list = (await stu.get('/api/enrollments')).json.enrollments.find((e) => e.courseId === 'c1');
  assert.equal(list.progress, 50);
  await s.close();
});

// ---------------- TC06 / TC07 Submissions (FR7) ----------------
test('TC06: an on-time submission stores the file, writes the record and notifies the instructor', async () => {
  const s = await start(); const stu = await U(s, 'stu2'), ins = await U(s, 'ins1');
  const before = (await ins.get('/api/notifications')).json.notifications.length;
  const r = await stu.upload('/api/assignments/a2/submit', { content: 'my stack' }, 'stack.py', 'print(1)');
  assert.equal(r.status, 201); assert.equal(r.json.submission.isLate, false); assert.equal(r.json.submission.status, 'submitted');
  const row = s.db.prepare("SELECT * FROM submissions WHERE id=?").get(r.json.submission.id);
  assert.equal(row.is_late, 0); assert.ok(fs.existsSync(path.join(s.uploadDir, row.stored_name)));
  const notes = (await ins.get('/api/notifications')).json.notifications;
  assert.equal(notes.length, before + 1); assert.equal(notes[0].type, 'submission'); assert.match(notes[0].body, /Chidi Okafor/);
  await s.close();
});

test('TC07: a submission after the due date is accepted and flagged late (server clock, not client input)', async () => {
  const s = await start(); const stu = await U(s, 'stu3');                      // a1 was due 7 days ago
  const r = await stu.upload('/api/assignments/a1/submit', { isLate: 'false', submittedAt: '2000-01-01' }, 'late.py', 'x');
  assert.equal(r.status, 201); assert.equal(r.json.submission.isLate, true);
  assert.ok(new Date(r.json.submission.submittedAt) > new Date(Date.now() - 60000));
  assert.equal(s.db.prepare('SELECT is_late FROM submissions WHERE id=?').get(r.json.submission.id).is_late, 1);
  await s.close();
});

test('TC06/07: resubmission replaces the file until graded; graded work is locked', async () => {
  const s = await start(); const stu = await U(s, 'stu2');
  const first = await stu.upload('/api/assignments/a2/submit', {}, 'v1.py', 'one');
  const old = s.db.prepare('SELECT stored_name FROM submissions WHERE id=?').get(first.json.submission.id).stored_name;
  const second = await stu.upload('/api/assignments/a2/submit', {}, 'v2.py', 'two');
  assert.equal(second.json.submission.id, first.json.submission.id); assert.equal(second.json.submission.fileName, 'v2.py');
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM submissions WHERE assignment_id=? AND student_id=(SELECT id FROM users WHERE email=?)').get('a2', USERS.stu2).c, 1);
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(fs.existsSync(path.join(s.uploadDir, old)), false, 'replaced file removed');
  assert.equal((await (await U(s, 'stu1')).upload('/api/assignments/a1/submit', {}, 'again.py', 'x')).status, 409);   // already graded
  await s.close();
});

test('TC06/07: only enrolled students may submit, and refused submissions write no file', async () => {
  const s = await start(); const before = files(s.uploadDir).length;
  assert.equal((await (await U(s, 'stu5')).upload('/api/assignments/a2/submit', {}, 'x.py', 'x')).status, 403);   // not enrolled in c1
  assert.equal((await (await U(s, 'ins1')).upload('/api/assignments/a2/submit', {}, 'x.py', 'x')).status, 403);
  assert.equal((await new Client(s.base).upload('/api/assignments/a2/submit', {}, 'x.py', 'x')).status, 401);
  assert.equal((await (await U(s, 'stu2')).upload('/api/assignments/a2/submit', {}, null)).status, 400);
  assert.equal(files(s.uploadDir).length, before);
  await s.close();
});

// ---------------- TC08 Grading (FR8, FR11) ----------------
test('TC08: instructor grades a submission; score and feedback appear for the student with a notification', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const subId = 's2';
  const g = await ins.req('PUT', `/api/submissions/${subId}/grade`, { score: 75, feedback: 'Solid work' });
  assert.equal(g.status, 200); assert.equal(g.json.submission.grade, 75);
  assert.deepEqual({ ...s.db.prepare('SELECT score, feedback FROM grades WHERE submission_id=?').get(subId) }, { score: 75, feedback: 'Solid work' });
  const a = (await stu.get('/api/assignments')).json.assignments.find((x) => x.id === 'a1');
  assert.equal(a.submission.grade, 75); assert.equal(a.submission.feedback, 'Solid work'); assert.equal(a.submission.status, 'graded');
  assert.ok((await stu.get('/api/notifications')).json.notifications.some((n) => n.type === 'grade' && /75\/100/.test(n.body)));
  const re = await ins.req('PUT', `/api/submissions/${subId}/grade`, { score: 80, feedback: 'Revised' });   // regrade overwrites
  assert.equal(re.json.submission.grade, 80); assert.equal(s.db.prepare('SELECT COUNT(*) c FROM grades WHERE submission_id=?').get(subId).c, 1);
  await s.close();
});

test('TC08: grading validation and authorisation', async () => {
  const s = await start(); const ins = await U(s, 'ins1');
  for (const bad of [{ score: 101 }, { score: -1 }, { score: '90' }, { score: null }, {}]) assert.equal((await ins.req('PUT', '/api/submissions/s2/grade', bad)).status, 400, JSON.stringify(bad));
  assert.equal((await (await U(s, 'ins2')).req('PUT', '/api/submissions/s2/grade', { score: 50 })).status, 404);   // not their course
  assert.equal((await (await U(s, 'stu2')).req('PUT', '/api/submissions/s2/grade', { score: 100 })).status, 403);  // student self-grading
  assert.equal(s.db.prepare("SELECT COUNT(*) c FROM grades WHERE submission_id='s2'").get().c, 0);
  assert.equal((await (await U(s, 'stu3')).get('/api/submissions/s2/download')).status, 404);                     // another student's file
  assert.equal((await (await U(s, 'stu2')).get('/api/submissions/s2/download')).status, 404);                     // seed placeholder has no file, but the owner passes access
  assert.equal((await (await U(s, 'ins2')).get('/api/assignments/a1/submissions')).status, 403);
  assert.equal((await ins.get('/api/assignments/a1/submissions')).json.submissions.length, 2);
  await s.close();
});

// ---------------- TC09 Quizzes (FR9) ----------------
const QUIZ = { title: 'Sprint Quiz', description: 'd', durationMinutes: 10, passingScore: 60, questions: [
  { text: 'Q1', options: ['a', 'b', 'c'], correctIndex: 0, points: 1, explanation: 'because a' },
  { text: 'Q2', options: ['a', 'b', 'c'], correctIndex: 1, points: 2 },
  { text: 'Q3', options: ['a', 'b'], correctIndex: 0, points: 1 }] };

test('TC09: instructor publishes a quiz; the student submits; the server scores and returns the result', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const q = await ins.post('/api/courses/c1/quizzes', QUIZ);
  assert.equal(q.status, 201); const qid = q.json.quiz.id;
  assert.equal(q.json.quiz.isPublished, false);
  assert.equal((await stu.get(`/api/quizzes/${qid}`)).status, 404);                                 // hidden until published
  assert.equal((await stu.post(`/api/quizzes/${qid}/attempts`)).status, 404);
  assert.ok(!(await stu.get('/api/quizzes')).json.quizzes.some((x) => x.id === qid));
  assert.equal((await ins.patch(`/api/quizzes/${qid}`, { isPublished: true })).json.quiz.isPublished, true);
  assert.ok((await stu.get('/api/notifications')).json.notifications.some((n) => n.type === 'quiz'));
  const st = await stu.post(`/api/quizzes/${qid}/attempts`);
  assert.equal(st.status, 201); assert.equal(st.json.questions.length, 3);
  assert.ok(!st.text.includes('correctIndex') && !st.text.includes('because a'), 'answer key never sent before submission');
  await stu.req('PUT', `/api/attempts/${st.json.attempt.id}/answers`, { answers: [0, 1, 1] });
  const done = await stu.post(`/api/attempts/${st.json.attempt.id}/submit`, { score: 999, answers: [0, 1, 1] });   // injected score is ignored
  assert.equal(done.status, 200);
  const a = done.json.attempt;
  assert.equal(a.score, 3); assert.equal(a.totalPoints, 4); assert.equal(a.passed, true);                       // 1 + 2 correct, Q3 wrong
  assert.equal(a.review[0].correctIndex, 0); assert.equal(a.review[0].yourAnswer, 0); assert.equal(a.review[0].explanation, 'because a');
  const row = s.db.prepare('SELECT * FROM attempts WHERE id=?').get(a.id);
  assert.equal(row.score, 3); assert.ok(row.completed_at);
  await s.close();
});

test('TC09: retakes keep history; exams allow a single attempt', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const q = (await ins.post('/api/courses/c1/quizzes', QUIZ)).json.quiz.id; await ins.patch(`/api/quizzes/${q}`, { isPublished: true });
  const e = (await ins.post('/api/courses/c1/quizzes', { ...QUIZ, title: 'Exam', isExam: true })).json.quiz.id; await ins.patch(`/api/quizzes/${e}`, { isPublished: true });
  for (const answers of [[0, 0, 1], [0, 1, 0]]) {
    const st = await stu.post(`/api/quizzes/${q}/attempts`); await stu.post(`/api/attempts/${st.json.attempt.id}/submit`, { answers });
  }
  const hist = (await stu.get(`/api/quizzes/${q}/attempts`)).json.attempts;
  assert.deepEqual(hist.map((a) => a.score).sort(), [1, 4]);
  const st = await stu.post(`/api/quizzes/${e}/attempts`); await stu.post(`/api/attempts/${st.json.attempt.id}/submit`, { answers: [0, 1, 0] });
  assert.equal((await stu.post(`/api/quizzes/${e}/attempts`)).status, 409);
  assert.equal((await ins.get(`/api/quizzes/${q}/attempts`)).json.attempts.length, 2);                            // instructor sees results
  await s.close();
});

test('TC09: the timer is enforced on the server (late answers are ignored, saved answers still count)', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const q = (await ins.post('/api/courses/c1/quizzes', { ...QUIZ, durationMinutes: 1 })).json.quiz.id; await ins.patch(`/api/quizzes/${q}`, { isPublished: true });
  const st = await stu.post(`/api/quizzes/${q}/attempts`); const id = st.json.attempt.id;
  assert.equal((await stu.req('PUT', `/api/attempts/${id}/answers`, { answers: [0, -1, -1] })).json.saved, 1);   // progressive save
  assert.deepEqual((await stu.get(`/api/attempts/${id}`)).json.attempt.answers, [0, -1, -1]);
  const resume = await stu.post(`/api/quizzes/${q}/attempts`);                                                    // reopening resumes, no new attempt
  assert.equal(resume.status, 200); assert.equal(resume.json.attempt.id, id);
  s.db.prepare("UPDATE attempts SET started_at=? WHERE id=?").run(new Date(Date.now() - 3 * 60000).toISOString(), id);   // 3 minutes ago
  assert.equal((await stu.req('PUT', `/api/attempts/${id}/answers`, { answers: [0, 1, 0] })).status, 409);       // too late to change
  const sub = await stu.post(`/api/attempts/${id}/submit`, { answers: [0, 1, 0] });
  assert.equal(sub.json.attempt.score, 1, 'only the answer saved before the deadline counts');
  assert.ok(new Date(sub.json.attempt.completedAt) <= new Date(sub.json.attempt.deadline));
  await s.close();
});

test('TC09: expired attempts are closed automatically when next read', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2');
  const q = (await ins.post('/api/courses/c1/quizzes', { ...QUIZ, durationMinutes: 1 })).json.quiz.id; await ins.patch(`/api/quizzes/${q}`, { isPublished: true });
  const id = (await stu.post(`/api/quizzes/${q}/attempts`)).json.attempt.id;
  await stu.req('PUT', `/api/attempts/${id}/answers`, { answers: [0, 1, 0] });
  s.db.prepare("UPDATE attempts SET started_at=? WHERE id=?").run(new Date(Date.now() - 5 * 60000).toISOString(), id);
  const a = (await stu.get(`/api/attempts/${id}`)).json.attempt;
  assert.equal(a.status, 'completed'); assert.equal(a.score, 4);
  await s.close();
});

test('TC09: quiz and attempt authorisation and validation', async () => {
  const s = await start(); const ins = await U(s, 'ins1');
  assert.equal((await (await U(s, 'ins2')).post('/api/courses/c1/quizzes', QUIZ)).status, 403);
  assert.equal((await (await U(s, 'stu2')).post('/api/courses/c1/quizzes', QUIZ)).status, 403);
  for (const bad of [{ ...QUIZ, questions: [] }, { ...QUIZ, title: '' }, { ...QUIZ, durationMinutes: 0 },
    { ...QUIZ, questions: [{ text: 'x', options: ['only'], correctIndex: 0 }] }, { ...QUIZ, questions: [{ text: 'x', options: ['a', 'b'], correctIndex: 5 }] }]) {
    assert.equal((await ins.post('/api/courses/c1/quizzes', bad)).status, 400);
  }
  const q = (await ins.post('/api/courses/c1/quizzes', QUIZ)).json.quiz.id; await ins.patch(`/api/quizzes/${q}`, { isPublished: true });
  const stu = await U(s, 'stu2'); const id = (await stu.post(`/api/quizzes/${q}/attempts`)).json.attempt.id;
  assert.equal((await stu.req('PUT', `/api/attempts/${id}/answers`, { answers: [9, 0, 0] })).status, 400);       // option out of range
  assert.equal((await stu.req('PUT', `/api/attempts/${id}/answers`, { answers: 'abc' })).status, 400);
  assert.equal((await (await U(s, 'stu3')).get(`/api/attempts/${id}`)).status, 404);                              // another student
  assert.equal((await (await U(s, 'stu3')).post(`/api/attempts/${id}/submit`, { answers: [0, 1, 0] })).status, 404);
  assert.equal((await (await U(s, 'stu5')).post(`/api/quizzes/${q}/attempts`)).status, 404);                      // not enrolled in c1
  assert.equal((await ins.post(`/api/quizzes/${q}/attempts`)).status, 403);                                       // instructors do not take quizzes
  assert.equal((await ins.del(`/api/quizzes/${q}`)).status, 409);                                                 // has an attempt
  await s.close();
});

test('Phase 3: every new endpoint refuses anonymous callers', async () => {
  const s = await start(); const c = new Client(s.base);
  const probes = [['GET', '/api/courses'], ['GET', '/api/courses/c1'], ['POST', '/api/courses'], ['GET', '/api/enrollments'], ['GET', '/api/assignments'],
    ['GET', '/api/quizzes'], ['GET', '/api/quizzes/qz1'], ['POST', '/api/quizzes/qz1/attempts'], ['GET', '/api/attempts/at1'], ['GET', '/api/notifications'],
    ['PUT', '/api/submissions/s1/grade'], ['GET', '/api/courses/c1/students'], ['POST', '/api/lessons/c1_m1_l1/complete']];
  for (const [m, p] of probes) assert.equal((await c.req(m, p, m === 'GET' ? undefined : {})).status, 401, `${m} ${p}`);
  assert.equal((await c.get('/api/public/courses')).status, 200);                                                  // the catalogue is the only public data
  await s.close();
});
