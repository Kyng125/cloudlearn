const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { start, Client, asUser, USERS, files } = require('./helpers');

const U = (s, k) => asUser(s.base, USERS[k]);
const uid = (s, k) => s.db.prepare('SELECT id FROM users WHERE email=?').get(USERS[k]).id;

// ---------------- TC10 Communication (FR10) ----------------
test('TC10: a student posts to a course forum and the instructor replies; both are stored and visible to enrolled participants', async () => {
  const s = await start(); const stu = await U(s, 'stu2'), ins = await U(s, 'ins1'), peer = await U(s, 'stu1');
  const t = await stu.post('/api/courses/c1/threads', { title: 'Recursion help', body: 'How do I trace a recursive call?' });
  assert.equal(t.status, 201); assert.equal(t.json.thread.body, 'How do I trace a recursive call?'); assert.equal(t.json.thread.authorName, 'Chidi Okafor');
  const rep = await ins.post(`/api/threads/${t.json.thread.id}/posts`, { body: 'Draw the call stack.' });
  assert.equal(rep.status, 201); assert.equal(rep.json.reply.authorRole, 'instructor');
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM posts WHERE thread_id=?').get(t.json.thread.id).c, 2);       // both persisted
  for (const who of [stu, ins, peer]) {                                                                           // visible to enrolled participants
    const th = (await who.get(`/api/threads/${t.json.thread.id}`)).json.thread;
    assert.equal(th.replies.length, 1); assert.equal(th.replies[0].body, 'Draw the call stack.');
  }
  assert.ok((await stu.get('/api/courses/c1/threads')).json.threads.some((x) => x.id === t.json.thread.id));
  await s.close();
});

test('TC10: forums are closed to non-enrolled students, other instructors and anonymous users', async () => {
  const s = await start(); const out = await U(s, 'stu5'), other = await U(s, 'ins2'), anon = new Client(s.base);   // ngozi is not in c1
  for (const c of [out, other]) {
    assert.equal((await c.get('/api/courses/c1/threads')).status, 403);
    assert.equal((await c.post('/api/courses/c1/threads', { title: 'x', body: 'y' })).status, 403);
    assert.equal((await c.get('/api/threads/th1')).status, 403);
    assert.equal((await c.post('/api/threads/th1/posts', { body: 'y' })).status, 403);
  }
  assert.equal((await anon.get('/api/threads/th1')).status, 401);
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM posts').get().c, 2);                                          // nothing was written
  await s.close();
});

test('TC10: replies and new threads notify the right people (never the author of the action)', async () => {
  const s = await start(); const stu = await U(s, 'stu2'), ins = await U(s, 'ins1');
  const insBefore = (await ins.get('/api/notifications')).json.unreadCount;
  const th = (await stu.post('/api/courses/c1/threads', { title: 'Q', body: 'b' })).json.thread;
  assert.equal((await ins.get('/api/notifications')).json.unreadCount, insBefore + 1);                            // instructor told about new thread
  await ins.post(`/api/threads/${th.id}/posts`, { body: 'answer' });
  const stuNotes = (await stu.get('/api/notifications')).json.notifications;
  assert.ok(stuNotes.some((n) => /replied to "Q"/.test(n.body)));                                                 // author told about reply
  assert.equal((await ins.get('/api/notifications')).json.unreadCount, insBefore + 1);                            // instructor not told about own reply
  await s.close();
});

test('TC10: forum validation and moderation rules', async () => {
  const s = await start(); const stu = await U(s, 'stu2'), peer = await U(s, 'stu1'), ins = await U(s, 'ins1');
  assert.equal((await stu.post('/api/courses/c1/threads', { title: '', body: 'b' })).status, 400);
  assert.equal((await stu.post('/api/courses/c1/threads', { title: 't', body: '   ' })).status, 400);
  assert.equal((await stu.post('/api/threads/th1/posts', { body: '' })).status, 400);
  const th = (await stu.post('/api/courses/c1/threads', { title: 'Mine', body: 'b' })).json.thread;
  const r1 = (await peer.post(`/api/threads/${th.id}/posts`, { body: 'peer reply' })).json.reply;
  const r2 = (await peer.post(`/api/threads/${th.id}/posts`, { body: 'second' })).json.reply;
  assert.equal((await peer.del(`/api/threads/${th.id}`)).status, 403);                  // only the author or a course manager
  assert.equal((await stu.del(`/api/posts/${r1.id}`)).status, 403);                     // thread author cannot delete someone else's reply
  assert.equal((await peer.del(`/api/posts/${r1.id}`)).status, 200);                    // reply author can
  assert.equal((await ins.del(`/api/posts/${r2.id}`)).status, 200);                     // course instructor can moderate
  const first = s.db.prepare('SELECT id FROM posts WHERE thread_id=? ORDER BY created_at, rowid').get(th.id).id;
  assert.equal((await stu.del(`/api/posts/${first}`)).status, 409);                     // opening post: delete the thread instead
  assert.equal((await (await U(s, 'ins2')).del(`/api/threads/${th.id}`)).status, 403);
  assert.equal((await stu.del(`/api/threads/${th.id}`)).status, 200);
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM posts WHERE thread_id=?').get(th.id).c, 0);   // cascade
  assert.equal((await ins.del('/api/threads/th1')).status, 200);                        // instructor removes a student's thread
  await s.close();
});

test('TC10: thread lists are scoped by role', async () => {
  const s = await start();
  await (await U(s, 'stu4')).post('/api/courses/c3/threads', { title: 'Web q', body: 'b' });          // emeka: c3 and c4
  const courses = async (k) => (await (await U(s, k)).get('/api/threads')).json.threads.map((t) => t.courseId).sort();
  assert.deepEqual(await courses('stu1'), ['c1', 'c3']);          // enrolled in c1..c4: sees the seeded c1 thread and the new c3 thread
  assert.deepEqual(await courses('stu5'), []);                    // only in c2, which has no threads
  assert.deepEqual(await courses('ins1'), ['c1']);
  assert.deepEqual(await courses('ins2'), ['c3']);
  assert.deepEqual(await courses('admin'), ['c1', 'c3']);
  await s.close();
});

// ---------------- Messages ----------------
test('Messages: allowed pairs only (student <-> their own instructors, admin <-> anyone)', async () => {
  const s = await start(); const stu = await U(s, 'stu5'), ins1 = await U(s, 'ins1'), admin = await U(s, 'admin');   // ngozi is only in c2 (ins1)
  const send = (c, to, body = 'hi') => c.post('/api/messages', { toId: uid(s, to), subject: 'S', body });
  assert.equal((await send(stu, 'ins1')).status, 201);
  assert.equal((await send(ins1, 'stu5')).status, 201);
  assert.equal((await send(stu, 'ins2')).status, 403);          // instructor of a course she is not in
  assert.equal((await send(stu, 'stu1')).status, 403);          // student to student
  assert.equal((await send(ins1, 'ins2')).status, 403);
  assert.equal((await send(stu, 'stu5')).status, 403);          // self
  assert.equal((await send(stu, 'admin')).status, 201); assert.equal((await send(admin, 'stu5')).status, 201);
  assert.equal((await stu.post('/api/messages', { toId: 'u_nobody', body: 'x' })).status, 403);   // same answer as a forbidden user: no enumeration
  assert.equal((await stu.post('/api/messages', { toId: uid(s, 'ins1'), body: '' })).status, 400);
  s.db.prepare('UPDATE users SET is_active=0 WHERE id=?').run(uid(s, 'ins1'));
  assert.equal((await send(stu, 'ins1')).status, 403);          // deactivated recipient
  await s.close();
});

test('Messages: inbox, sent, read state, participant-only access and notifications', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu1'), third = await U(s, 'stu2');
  const inbox = (await stu.get('/api/messages')).json;                                // seeded m1 from instructor
  assert.equal(inbox.messages.length, 1); assert.equal(inbox.unreadCount, 1);
  assert.equal((await third.get('/api/messages/m1')).status, 404);                    // not a participant
  assert.equal((await ins.post('/api/messages/m1/read')).status, 403);                // sender cannot mark it read
  assert.equal((await stu.get('/api/messages/m1')).json.message.isRead, true);        // opening marks as read
  assert.equal((await stu.get('/api/messages')).json.unreadCount, 0);
  const sent = await stu.post('/api/messages', { toId: uid(s, 'ins1'), subject: 'Question', body: 'Can we meet?' });
  assert.equal((await ins.get('/api/messages')).json.messages[0].subject, 'Question');
  assert.equal((await stu.get('/api/messages?box=sent')).json.messages[0].id, sent.json.message.id);
  assert.ok((await ins.get('/api/notifications')).json.notifications.some((n) => n.type === 'message' && /Alex Johnson/.test(n.body)));
  const contacts = (await (await U(s, 'stu5')).get('/api/contacts')).json.contacts.map((c) => c.id).sort();
  assert.deepEqual(contacts, [uid(s, 'admin'), uid(s, 'ins1')].sort());
  await s.close();
});

test('Notifications: unread count, mark one, mark all, and isolation between users', async () => {
  const s = await start(); const stu = await U(s, 'stu1'), other = await U(s, 'stu2');
  const n = (await stu.get('/api/notifications')).json; assert.equal(n.unreadCount, 2);
  assert.equal((await other.post('/api/notifications/n1/read')).status, 404);         // someone else's notification
  assert.equal((await stu.post('/api/notifications/n1/read')).status, 200);
  assert.equal((await stu.get('/api/notifications?unread=1')).json.notifications.length, 1);
  assert.equal((await stu.post('/api/notifications/read-all')).json.updated, 1);
  assert.equal((await stu.get('/api/notifications')).json.unreadCount, 0);
  await s.close();
});

// ---------------- Activity log (real events) ----------------
test('Activity log: real events are recorded with the right user, and the log is filterable and admin-only', async () => {
  const s = await start(); const ins = await U(s, 'ins1'), stu = await U(s, 'stu2'), admin = await U(s, 'admin');
  const c = (await ins.post('/api/courses', { title: 'Logged Course' })).json.course;
  await ins.patch(`/api/courses/${c.id}`, { isPublished: true });
  await stu.post(`/api/courses/${c.id}/enroll`);
  await stu.upload('/api/assignments/a2/submit', {}, 'x.py', 'x');
  const sid = s.db.prepare("SELECT id FROM submissions WHERE assignment_id='a2'").get().id;
  await ins.req('PUT', `/api/submissions/${sid}/grade`, { score: 40, feedback: 'ok' });
  await new Client(s.base).login(USERS.stu1, 'wrong');
  const logs = (await admin.get('/api/admin/activity-logs?limit=200')).json;
  const has = (action, user) => logs.logs.some((l) => l.action === action && l.user === USERS[user]);
  assert.ok(has('Created course', 'ins1')); assert.ok(has('Published course', 'ins1')); assert.ok(has('Enrolled in course', 'stu2'));
  assert.ok(has('Submitted assignment', 'stu2')); assert.ok(has('Graded submission', 'ins1')); assert.ok(has('Logged in', 'admin'));
  const failed = (await admin.get('/api/admin/activity-logs?status=failed')).json;
  assert.ok(failed.logs.length >= 1 && failed.logs.every((l) => l.status === 'failed') && failed.total === failed.logs.length);
  assert.ok((await admin.get('/api/admin/activity-logs?q=Logged%20Course')).json.logs.every((l) => /Logged Course/.test(l.detail)));
  assert.equal((await admin.get('/api/admin/activity-logs?limit=2&offset=1')).json.logs.length, 2);
  assert.equal((await stu.get('/api/admin/activity-logs')).status, 403);
  assert.ok(!JSON.stringify(logs).includes('demo123') && !JSON.stringify(logs).includes('wrong'));
  await s.close();
});

// ---------------- TC11 Reporting (FR12) ----------------
test('TC11: the course performance report reconciles with the raw committed records', async () => {
  const s = await start(); const admin = await U(s, 'admin'), stu = await U(s, 'stu2'), ins = await U(s, 'ins1');
  // create fresh activity through the API so the report must reflect committed changes
  await stu.upload('/api/assignments/a2/submit', {}, 'a.py', 'x');
  await ins.req('PUT', `/api/submissions/${s.db.prepare("SELECT id FROM submissions WHERE assignment_id='a2'").get().id}/grade`, { score: 25, feedback: '' });
  const att = (await stu.post('/api/quizzes/qz1/attempts')).json.attempt; await stu.post(`/api/attempts/${att.id}/submit`, { answers: [0, 1, 2, 1, 1] });
  const rep = (await admin.get('/api/reports/course-performance')).json;
  assert.equal(rep.rows.length, 5);
  const raw = (sql, ...a) => s.db.prepare(sql).all(...a);
  for (const c of raw('SELECT * FROM courses')) {
    const row = rep.rows.find((r) => r.course === c.title); assert.ok(row, c.title);
    assert.equal(row.enrolled, raw('SELECT * FROM enrollments WHERE course_id=?', c.id).length);
    const subs = raw('SELECT s.* FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id=?', c.id);
    assert.equal(row.submissions, subs.length); assert.equal(row.lateSubmissions, subs.filter((x) => x.is_late).length);
    const graded = raw('SELECT g.score, a.max_points FROM grades g JOIN submissions s ON s.id=g.submission_id JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id=?', c.id);
    assert.equal(row.gradedSubmissions, graded.length);
    const avg = graded.length ? graded.reduce((a, g) => a + (g.score / g.max_points) * 100, 0) / graded.length : null;
    assert.equal(row.avgGradePct, avg === null ? null : Math.round(avg * 10) / 10);
    const atts = raw('SELECT t.* FROM attempts t JOIN quizzes q ON q.id=t.quiz_id WHERE q.course_id=? AND t.completed_at IS NOT NULL', c.id);
    assert.equal(row.quizAttempts, atts.length);
  }
  const c1 = rep.rows.find((r) => r.course.startsWith('Programming'));
  assert.equal(c1.submissions, 3); assert.equal(c1.lateSubmissions, 1); assert.equal(c1.gradedSubmissions, 2);   // s1, s2(late, ungraded), new a2
  assert.equal(c1.avgGradePct, Math.round(((88 + 50) / 2) * 10) / 10);                                         // 88/100 and 25/50
  assert.equal(c1.quizAttempts, 2);
  const sum = (k) => rep.rows.reduce((a, r) => a + r[k], 0);
  assert.equal(rep.summary.enrolments, sum('enrolled')); assert.equal(rep.summary.enrolments, s.db.prepare('SELECT COUNT(*) c FROM enrollments').get().c);
  assert.equal(rep.summary.submissions, s.db.prepare('SELECT COUNT(*) c FROM submissions').get().c);
  await s.close();
});

test('TC11: user and assessment reports reconcile with raw rows', async () => {
  const s = await start(); const admin = await U(s, 'admin');
  const u = (await admin.get('/api/reports/users')).json;
  const cnt = (role) => s.db.prepare('SELECT COUNT(*) c FROM users WHERE role=?').get(role).c;
  assert.equal(u.summary.total, s.db.prepare('SELECT COUNT(*) c FROM users').get().c);
  assert.equal(u.summary.students, cnt('student')); assert.equal(u.summary.instructors, cnt('instructor')); assert.equal(u.summary.admins, cnt('admin'));
  assert.equal(u.rows.find((r) => r.email === USERS.admin).lastLogin !== '', true);
  assert.equal(u.rows.find((r) => r.email === USERS.stu1).courses, 4);
  assert.ok(!JSON.stringify(u).includes('$2'));                                                  // no password hashes
  const a = (await admin.get('/api/reports/assessment-results')).json;
  assert.equal(a.rows.length, s.db.prepare('SELECT COUNT(*) c FROM assignments').get().c + s.db.prepare('SELECT COUNT(*) c FROM quizzes').get().c);
  const a1 = a.rows.find((r) => r.title === 'Python Functions Project');
  assert.deepEqual([a1.participants, a1.late, a1.graded, a1.avgPct, a1.highestPct, a1.lowestPct], [2, 1, 1, 88, 88, 88]);
  const q1 = a.rows.find((r) => r.title === 'Python Basics Quiz');
  assert.deepEqual([q1.type, q1.participants, q1.graded, q1.avgPct, q1.passRatePct], ['Quiz', 1, 1, 80, 100]);
  await s.close();
});

test('TC11: CSV export has the same rows, safe quoting and spreadsheet-formula protection', async () => {
  const s = await start(); const admin = await U(s, 'admin'), ins = await U(s, 'ins1');
  await ins.post('/api/courses', { title: '=HYPERLINK("http://evil","click")' });
  await ins.post('/api/courses', { title: 'Comma, "Quote" Course' });
  const json = (await admin.get('/api/reports/course-performance')).json;
  const res = await fetch(`${s.base}/api/reports/course-performance?format=csv`, { headers: { cookie: admin.cookie } });
  assert.equal(res.status, 200); assert.match(res.headers.get('content-type'), /text\/csv/); assert.match(res.headers.get('content-disposition'), /attachment; filename="course-performance-/);
  const buf = Buffer.from(await res.arrayBuffer()); assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'UTF-8 BOM for Excel');
  const text = buf.toString('utf8').replace(/^\ufeff/, '');
  const lines = text.trim().split('\r\n'); assert.equal(lines.length, json.rows.length + 1);
  assert.ok(text.includes(`'=HYPERLINK("http://evil","click")`) || text.includes(`"'=HYPERLINK(""http://evil"",""click"")"`), 'formula cell neutralised');
  assert.ok(!/(^|\r\n)=HYPERLINK/.test(text));
  assert.ok(text.includes('"Comma, ""Quote"" Course"'));
  await s.close();
});

test('TC11: report access by role, instructor scope and empty scope', async () => {
  const s = await start(); const anon = new Client(s.base), stu = await U(s, 'stu1'), ins = await U(s, 'ins1'), admin = await U(s, 'admin');
  for (const p of ['users', 'course-performance', 'assessment-results']) {
    assert.equal((await anon.get(`/api/reports/${p}`)).status, 401);
    assert.equal((await stu.get(`/api/reports/${p}`)).status, 403);
    assert.equal((await stu.get(`/api/reports/${p}?format=csv`)).status, 403);
  }
  assert.equal((await ins.get('/api/reports/users')).status, 403);                       // user data is admin-only
  const own = (await ins.get('/api/reports/course-performance')).json.rows.map((r) => r.course).sort();
  assert.deepEqual(own, ['Database Systems and SQL', 'Programming Fundamentals with Python']);   // only ins1's courses
  assert.ok((await ins.get('/api/reports/assessment-results')).json.rows.every((r) => !/Web Development|Networks/.test(r.course)));
  const made = (await admin.post('/api/admin/users', { name: 'New Lecturer', email: 'newlec@example.com', role: 'instructor' })).json;
  const nl = new Client(s.base); await nl.login('newlec@example.com', made.temporaryPassword);
  const empty = await nl.get('/api/reports/course-performance');
  assert.equal(empty.status, 200); assert.deepEqual(empty.json.rows, []); assert.equal(empty.json.summary.courses, 0);
  assert.ok((await admin.get('/api/admin/activity-logs?q=report')).json.logs.length >= 1);        // report generation is audited
  await s.close();
});

// ---------------- Backup and restore (FR13 support) ----------------
async function populate(s, admin) {
  await (await U(s, 'ins1')).upload('/api/courses/c1/materials', {}, 'before.txt', 'present at backup time');
}

test('Backup: creates a consistent snapshot (database + uploads) and lists it', async () => {
  const s = await start(); const admin = await U(s, 'admin'); await populate(s, admin);
  const b = await admin.post('/api/admin/backups');
  assert.equal(b.status, 201); assert.match(b.json.backup.name, /^backup-\d{8}-\d{6}-[a-z0-9]+$/);
  const dir = path.join(s.backupDir, b.json.backup.name);
  assert.ok(fs.existsSync(path.join(dir, 'cloudlearn.db'))); assert.equal(fs.readdirSync(path.join(dir, 'uploads')).length, 1);
  const copy = new Database(path.join(dir, 'cloudlearn.db'), { readonly: true });
  assert.equal(copy.prepare('SELECT COUNT(*) c FROM users').get().c, s.db.prepare('SELECT COUNT(*) c FROM users').get().c); copy.close();
  assert.equal(b.json.backup.users, 8);
  assert.equal((await admin.get('/api/admin/backups')).json.backups[0].name, b.json.backup.name);
  assert.equal((await (await U(s, 'ins1')).post('/api/admin/backups')).status, 403);
  assert.equal((await new Client(s.base).get('/api/admin/backups')).status, 401);
  for (const who of ['ins1', 'stu1']) {                                                   // restore and delete are admin-only too
    const c = await U(s, who);
    assert.equal((await c.post(`/api/admin/backups/${b.json.backup.name}/restore`, { confirm: true })).status, 403);
    assert.equal((await c.del(`/api/admin/backups/${b.json.backup.name}`)).status, 403);
  }
  assert.ok(fs.existsSync(path.join(dir, 'cloudlearn.db')));
  await s.close();
});

test('Restore: returns data AND files to the backed-up state, keeps a safety copy and revokes sessions', async () => {
  const s = await start(); const admin = await U(s, 'admin'); await populate(s, admin);
  const name = (await admin.post('/api/admin/backups')).json.backup.name;
  // changes made after the backup
  await admin.post('/api/admin/users', { name: 'Later User', email: 'later@example.com', role: 'student' });
  await (await U(s, 'ins1')).upload('/api/courses/c1/materials', {}, 'after.txt', 'added later');
  s.db.prepare("UPDATE courses SET title='Tampered' WHERE id='c2'").run();
  const bad = await admin.post(`/api/admin/backups/${name}/restore`, {});
  assert.equal(bad.status, 400); assert.equal(s.db.prepare("SELECT COUNT(*) c FROM users WHERE email='later@example.com'").get().c, 1);   // needs confirm
  const r = await admin.post(`/api/admin/backups/${name}/restore`, { confirm: true });
  assert.equal(r.status, 200); assert.ok(r.json.safetyBackup);
  assert.equal(s.db.prepare("SELECT COUNT(*) c FROM users WHERE email='later@example.com'").get().c, 0);
  assert.equal(s.db.prepare("SELECT title FROM courses WHERE id='c2'").get().title, 'Database Systems and SQL');
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM materials').get().c, 1);
  assert.deepEqual(files(s.uploadDir).length, 1);                                        // after.txt file removed with its record
  assert.deepEqual(s.db.pragma('foreign_key_check'), []);
  assert.equal((await admin.get('/api/auth/me')).status, 401);                           // sessions revoked
  const again = await U(s, 'admin');
  const safety = new Database(path.join(s.backupDir, r.json.safetyBackup, 'cloudlearn.db'), { readonly: true });
  assert.equal(safety.prepare("SELECT COUNT(*) c FROM users WHERE email='later@example.com'").get().c, 1);   // undo path exists
  safety.close();
  assert.ok((await again.get('/api/admin/activity-logs?q=Restored')).json.logs.length >= 1);
  await s.close();
});

test('Restore: a restore cannot resurrect the login of a since-deactivated user', async () => {
  const s = await start(); const admin = await U(s, 'admin'); const stu = await U(s, 'stu2');
  const name = (await admin.post('/api/admin/backups')).json.backup.name;                // backup contains stu2's live session
  await admin.patch(`/api/admin/users/${uid(s, 'stu2')}`, { isActive: false });
  await admin.post(`/api/admin/backups/${name}/restore`, { confirm: true });
  assert.equal((await stu.get('/api/auth/me')).status, 401);                             // old session is gone
  await s.close();
});

test('Restore: invalid names, damaged or incompatible backups are refused and live data is untouched', async () => {
  const s = await start(); const admin = await U(s, 'admin');
  for (const bad of ['..', '..%2F..%2Fetc', 'backup-20260101-000000', 'nope', 'backup-x-y-z']) assert.equal((await admin.post(`/api/admin/backups/${bad}/restore`, { confirm: true })).status, 404, bad);
  const name = (await admin.post('/api/admin/backups')).json.backup.name, dbf = path.join(s.backupDir, name, 'cloudlearn.db');
  const before = s.db.prepare('SELECT COUNT(*) c FROM users').get().c;
  // incompatible layout
  const x = new Database(dbf); x.exec('ALTER TABLE users ADD COLUMN extra TEXT'); x.close();
  assert.equal((await admin.post(`/api/admin/backups/${name}/restore`, { confirm: true })).status, 400);
  // damaged file
  fs.writeFileSync(dbf, 'this is not a sqlite database');
  const dmg = await admin.post(`/api/admin/backups/${name}/restore`, { confirm: true });
  assert.ok([400, 500].includes(dmg.status));
  assert.equal(s.db.prepare('SELECT COUNT(*) c FROM users').get().c, before);
  assert.equal((await admin.get('/api/auth/me')).status, 200);                           // still signed in: nothing happened
  await s.close();
});

test('Restore: a backup that breaks referential integrity is rejected atomically (nothing half-restored)', async () => {
  const s = await start(); const admin = await U(s, 'admin');
  const name = (await admin.post('/api/admin/backups')).json.backup.name;
  const x = new Database(path.join(s.backupDir, name, 'cloudlearn.db'));
  x.pragma('foreign_keys = OFF');
  x.exec("INSERT INTO enrollments (id,student_id,course_id,enrolled_at) VALUES ('bad','ghost','ghost','2026-01-01')"); x.close();
  s.db.prepare("UPDATE courses SET title='Live Edit' WHERE id='c1'").run();
  const r = await admin.post(`/api/admin/backups/${name}/restore`, { confirm: true });
  assert.equal(r.status, 400); assert.match(r.json.error, /referential integrity/);
  assert.equal(s.db.prepare("SELECT title FROM courses WHERE id='c1'").get().title, 'Live Edit');       // rolled back
  assert.equal(s.db.pragma('foreign_keys', { simple: true }), 1);                                       // enforcement restored
  assert.equal(s.db.prepare("SELECT COUNT(*) c FROM enrollments WHERE id='bad'").get().c, 0);
  await s.close();
});

test('Backup: delete works and unknown names are 404', async () => {
  const s = await start(); const admin = await U(s, 'admin');
  const name = (await admin.post('/api/admin/backups')).json.backup.name;
  assert.equal((await admin.del(`/api/admin/backups/${name}`)).status, 200);
  assert.equal(fs.existsSync(path.join(s.backupDir, name)), false);
  assert.equal((await admin.del(`/api/admin/backups/${name}`)).status, 404);
  await s.close();
});
