// Phase 6a: every API route x every kind of caller. Expectations come from the documented
// access rules (D-series decisions), NOT from reading each handler, so a missing check shows up as a failure.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path');
const { start, Client, asUser, USERS } = require('./helpers');
const { createApp } = require('../src/app');
const { openDb } = require('../src/db');

const ACTORS = ['anon', 'stuIn', 'stuPeer', 'stuOut', 'insOwn', 'insOther', 'admin'];
const EMAIL = { stuIn: USERS.stu1, stuPeer: USERS.stu2, stuOut: USERS.stu4, insOwn: USERS.ins1, insOther: USERS.ins2, admin: USERS.admin };
const ALL = ACTORS, AUTHED = ACTORS.slice(1), STAFF_OWN = ['insOwn', 'admin'];
const CONTENT = ['stuIn', 'stuPeer', 'insOwn', 'admin'];           // may see course content
const STUDENTS = ['stuIn', 'stuPeer', 'stuOut'];

// [method, template, allowedActors, body?]
const M = [
  ['GET', '/api/health', ALL], ['GET', '/api/public/courses', ALL],
  ['POST', '/api/auth/register', ALL, { name: 'X Y', email: 'matrix@example.com', password: 'secret12' }],
  ['POST', '/api/auth/login', ALL, { email: 'nobody@example.com', password: 'x' }, 'login-any'],
  ['POST', '/api/auth/logout', ALL],
  ['GET', '/api/auth/me', AUTHED], ['PATCH', '/api/auth/me', AUTHED, { bio: 'hi' }], ['POST', '/api/auth/change-password', AUTHED, { currentPassword: 'demo123', newPassword: 'newpass12' }],
  // courses and content
  ['GET', '/api/courses', AUTHED], ['POST', '/api/courses', STAFF_OWN.concat('insOther'), { title: 'T', description: 'D', category: 'Web', level: 'Beginner' }],
  ['GET', '/api/courses/:course', CONTENT.concat(['stuOut', 'insOther']) /* published course: visible to everyone signed in */],
  ['PATCH', '/api/courses/:course', STAFF_OWN, { title: 'New title' }], ['DELETE', '/api/courses/:course', STAFF_OWN],
  ['POST', '/api/courses/:course/modules', STAFF_OWN, { title: 'M' }],
  ['PATCH', '/api/modules/:module', STAFF_OWN, { title: 'M2' }], ['DELETE', '/api/modules/:module', STAFF_OWN],
  ['POST', '/api/modules/:module/lessons', STAFF_OWN, { title: 'L', type: 'text', content: 'c', durationMinutes: 5 }],
  ['PATCH', '/api/lessons/:lesson', STAFF_OWN, { title: 'L2' }], ['DELETE', '/api/lessons/:lesson', STAFF_OWN],
  ['POST', '/api/lessons/:lesson/complete', ['stuIn', 'stuPeer']],
  ['GET', '/api/courses/:course/materials', CONTENT], ['POST', '/api/courses/:course/materials', STAFF_OWN],
  ['GET', '/api/materials/:material/download', CONTENT], ['DELETE', '/api/materials/:material', STAFF_OWN],
  ['POST', '/api/courses/:course/enroll', STUDENTS],
  ['GET', '/api/enrollments', AUTHED], ['GET', '/api/courses/:course/students', STAFF_OWN], ['GET', '/api/courses/:course/progress', ['stuIn', 'stuPeer']],
  // assignments and grading
  ['GET', '/api/assignments', AUTHED], ['GET', '/api/courses/:course/assignments', CONTENT],
  ['POST', '/api/courses/:course/assignments', STAFF_OWN, { title: 'A', description: 'd', dueDate: '2031-01-01', maxPoints: 10 }],
  ['POST', '/api/assignments/:assignment/submit', ['stuIn', 'stuPeer'], null],
  ['GET', '/api/assignments/:assignment/submissions', STAFF_OWN],
  ['GET', '/api/submissions/:submission/download', ['stuIn', 'insOwn', 'admin']],
  ['PUT', '/api/submissions/:submission/grade', STAFF_OWN, { score: 5, feedback: 'ok' }],
  // quizzes
  ['GET', '/api/quizzes', AUTHED], ['GET', '/api/quizzes/:quiz', CONTENT],
  ['POST', '/api/courses/:course/quizzes', STAFF_OWN, { title: 'Q', durationMinutes: 5, passingScore: 50, isExam: false, questions: [{ text: 'q', options: ['a', 'b'], correctIndex: 0 }] }],
  ['PATCH', '/api/quizzes/:quiz', STAFF_OWN, { isPublished: false }], ['DELETE', '/api/quizzes/:quizEmpty', STAFF_OWN],
  ['POST', '/api/quizzes/:quiz/attempts', ['stuIn', 'stuPeer']], ['GET', '/api/quizzes/:quiz/attempts', ['stuIn', 'stuPeer', 'insOwn', 'admin']],
  ['PUT', '/api/attempts/:attemptOpen/answers', ['stuIn'], { answers: [0] }], ['POST', '/api/attempts/:attemptOpen/submit', ['stuIn'], { answers: [0] }],
  ['GET', '/api/attempts/:attempt', ['stuIn', 'insOwn', 'admin']],
  // communication
  ['GET', '/api/threads', AUTHED], ['GET', '/api/courses/:course/threads', CONTENT],
  ['POST', '/api/courses/:course/threads', CONTENT, { title: 'T', body: 'b' }], ['GET', '/api/threads/:thread', CONTENT],
  ['POST', '/api/threads/:thread/posts', CONTENT, { body: 'r' }], ['DELETE', '/api/threads/:thread', ['stuIn', 'insOwn', 'admin']], ['DELETE', '/api/posts/:post', ['insOwn', 'admin']],
  ['GET', '/api/contacts', AUTHED], ['GET', '/api/messages', AUTHED], ['POST', '/api/messages', ['stuIn', 'stuPeer', 'insOwn', 'admin'], { toId: ':insOwnId', subject: 's', body: 'b' }],
  ['GET', '/api/messages/:message', ['stuIn', 'insOwn']], ['POST', '/api/messages/:message/read', ['stuIn']],
  ['GET', '/api/notifications', AUTHED], ['POST', '/api/notifications/:notification/read', ['stuIn']], ['POST', '/api/notifications/read-all', AUTHED],
  // reports
  ['GET', '/api/reports/users', ['admin']], ['GET', '/api/reports/course-performance', ['insOwn', 'insOther', 'admin']], ['GET', '/api/reports/assessment-results', ['insOwn', 'insOther', 'admin']],
  // admin
  ['GET', '/api/admin/users', ['admin']], ['POST', '/api/admin/users', ['admin'], { name: 'N N', email: 'm2@example.com', role: 'student' }],
  ['PATCH', '/api/admin/users/:stu5', ['admin'], { name: 'Renamed' }], ['DELETE', '/api/admin/users/:stu5', ['admin']],
  ['GET', '/api/admin/activity-logs', ['admin']],
  ['GET', '/api/admin/backups', ['admin']], ['POST', '/api/admin/backups', ['admin']],
  ['DELETE', '/api/admin/backups/:backup', ['admin']], ['POST', '/api/admin/backups/:backup/restore', ['admin'], { confirm: true }],
];

// Express walker: lists every mounted route so the matrix cannot silently miss one.
function mounted(app) {
  const out = new Set();
  const walk = (stack, prefix) => {
    for (const l of stack) {
      if (l.route) for (const m of Object.keys(l.route.methods)) out.add(`${m.toUpperCase()} ${prefix}${l.route.path}`);
      else if (l.name === 'router' && l.handle.stack) {
        const p = l.regexp.source.replace('^\\/?(?=\\/|$)', '').replace('\\/?(?=\\/|$)', '').replace(/^\^/, '').replace(/\\\//g, '/');
        walk(l.handle.stack, prefix + (l.regexp.fast_slash ? '' : p));
      }
    }
  };
  walk(app._router.stack, '');
  return out;
}
const norm = (t) => t.replace(/:[A-Za-z0-9]+/g, ':p').replace(/(.)\/$/, '$1');

function fresh() {
  return start().then(async (s) => {
    const q = (sql, ...a) => s.db.prepare(sql).get(...a);
    const ctx = { course: 'c1', stu5: 'u_stu5', insOwnId: 'u_ins1' };
    ctx.module = q('SELECT id FROM modules WHERE course_id=?', 'c1').id;
    ctx.lesson = q('SELECT l.id FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=?', 'c1').id;
    ctx.assignment = q('SELECT id FROM assignments WHERE course_id=? AND id NOT IN (SELECT assignment_id FROM submissions WHERE student_id=?)', 'c1', 'u_stu1')?.id || q('SELECT id FROM assignments WHERE course_id=?', 'c1').id;
    ctx.submission = q('SELECT s.id FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id=? AND s.student_id=?', 'c1', 'u_stu1').id;
    ctx.quiz = q('SELECT id FROM quizzes WHERE course_id=? AND is_published=1', 'c1').id;
    const ins = s.db.prepare('INSERT INTO attempts (id,quiz_id,student_id,started_at,completed_at,answers_json,score,total_points,passed) VALUES (?,?,?,?,?,?,?,?,?)');
    ins.run('atDone', ctx.quiz, 'u_stu1', '2026-01-01T10:00:00.000Z', '2026-01-01T10:05:00.000Z', '[0,0,0,0,0]', 2, 5, 0);
    ins.run('atOpen', ctx.quiz, 'u_stu1', new Date().toISOString(), null, '[]', null, null, null);
    ctx.attempt = 'atDone'; ctx.attemptOpen = 'atOpen';
    ctx.thread = q('SELECT id FROM threads WHERE course_id=?', 'c1').id;
    ctx.post = 'p2'; // the instructor's reply: only its author, course staff or admin may delete it
    ctx.message = q('SELECT id FROM messages WHERE from_id=? AND to_id=?', 'u_ins1', 'u_stu1').id;
    ctx.notification = q('SELECT id FROM notifications WHERE user_id=?', 'u_stu1').id;
    // a stored material so download has a real file behind it
    fs.writeFileSync(path.join(s.uploadDir, 'mat.txt'), 'hello');
    s.db.prepare('INSERT INTO materials (id,course_id,uploaded_by,file_name,stored_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?)').run('mat1', 'c1', 'u_ins1', 'mat.txt', 'mat.txt', 'text/plain', 5, new Date().toISOString());
    ctx.material = 'mat1';
    fs.writeFileSync(path.join(s.uploadDir, 'seed-placeholder'), 'seeded');
    // an unattempted draft quiz (deletable) and an open attempt for the student
    s.db.prepare('INSERT INTO quizzes (id,course_id,title,duration_minutes,passing_score,is_exam,is_published,created_at) VALUES (?,?,?,?,?,?,?,?)').run('qEmpty', 'c1', 'Draft', 5, 50, 0, 0, new Date().toISOString());
    ctx.quizEmpty = 'qEmpty';
    return { s, ctx };
  });
}

async function actorClient(base, who) { if (who === 'anon') return new Client(base); return asUser(base, EMAIL[who]); }

test('matrix covers every mounted route', async () => {
  const s = await start(); const app = createApp(openDb(':memory:'), { staticDir: '/nonexistent', bcryptRounds: 4, uploadDir: s.uploadDir, backupDir: s.backupDir });
  const live = [...mounted(app)].map((x) => { const [m, p] = x.split(' '); return `${m} ${norm(p)}`; }).filter((x) => x.includes('/api/') || x.includes('/auth') || true);
  const have = new Set(M.map(([m, t]) => `${m} ${norm(t)}`));
  const missing = live.filter((x) => !have.has(x) && !/^(ALL|_ALL)/.test(x));
  const stale = [...have].filter((x) => !live.some((l) => l === x || l.endsWith(x.split(' ')[1].replace('/api', ''))));
  await s.close();
  assert.deepEqual(missing, [], 'routes without a matrix row');
  assert.ok(live.length > 55, 'walker found routes: ' + live.length);
  void stale;
});

for (const [method, tmpl, allowed, body, flag] of M) {
  test(`${method} ${tmpl}`, async () => {
    const results = [];
    for (const who of ACTORS) {
      const { s, ctx } = await fresh();
      try {
        const c = await actorClient(s.base, who);
        let backup = null;
        if (tmpl.includes(':backup')) { const adm = await asUser(s.base, EMAIL.admin); backup = (await adm.post('/api/admin/backups')).json.backup.name; }
        let url = tmpl.replace(/:([A-Za-z0-9]+)/g, (_m, k) => (k === 'backup' ? backup : ctx[k]));
        let b = body === null ? undefined : body && JSON.parse(JSON.stringify(body).replace(/":([A-Za-z0-9]+)Id"/g, (_m, k) => `"${ctx[k + 'Id']}"`));
        if (b && b.toId) b.toId = who === 'insOwn' ? 'u_stu1' : ctx.insOwnId;
        let r;
        if (method === 'GET') r = await c.get(url);
        else if (method === 'DELETE') r = await c.del(url);
        else if (method === 'PATCH') r = await c.patch(url, b);
        else if (method === 'PUT') r = await c.req('PUT', url, b);
        else if (tmpl.endsWith('/materials') || tmpl.endsWith('/submit')) r = await c.upload(url, { content: 'x' }, 'f.txt', 'data');
        else r = await c.post(url, b);
        results.push([who, r.status]);
      } finally { await s.close(); }
    }
    for (const [who, status] of results) {
      const ok = allowed.includes(who);
      if (flag === 'login-any') continue;
      if (ok) assert.ok(![401, 403, 404].includes(status), `${who} should be allowed on ${method} ${tmpl} but got ${status}`);
      else if (who === 'anon') assert.equal(status, 401, `anon on ${method} ${tmpl}`);
      else assert.ok([403, 404].includes(status), `${who} should be denied on ${method} ${tmpl} but got ${status}`);
    }
  });
}
