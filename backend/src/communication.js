const express = require('express');
const { newId, now } = require('./db');
const { str } = require('./access');

function communicationRoutes({ db, auth, access }) {
  const r = express.Router();
  r.use(auth.requireAuth);
  const { course, canManage, canAccessContent, canSee, loadCourse, notify } = access;
  const userRow = (id) => db.prepare('SELECT id,name,role,is_active FROM users WHERE id=?').get(id);

  // ================= Forums (TC10) =================
  const postOut = (p) => { const a = userRow(p.author_id) || {}; return { id: p.id, threadId: p.thread_id, authorId: p.author_id, authorName: a.name || '', authorRole: a.role || '', body: p.body, createdAt: p.created_at }; };
  const postsOf = (threadId) => db.prepare('SELECT * FROM posts WHERE thread_id=? ORDER BY created_at, rowid').all(threadId);
  const threadOut = (t) => {
    const [first, ...rest] = postsOf(t.id), a = userRow(t.author_id) || {}, c = course(t.course_id);
    return { id: t.id, courseId: t.course_id, courseTitle: c.title, authorId: t.author_id, authorName: a.name || '', authorRole: a.role || '',
      title: t.title, body: first ? first.body : '', createdAt: t.created_at, replies: rest.map(postOut) };
  };

  r.get('/threads', (req, res) => {
    const u = req.user;
    const rows = u.role === 'student' ? db.prepare('SELECT * FROM threads WHERE course_id IN (SELECT course_id FROM enrollments WHERE student_id=?) ORDER BY created_at DESC').all(u.id)
      : u.role === 'instructor' ? db.prepare('SELECT t.* FROM threads t JOIN courses c ON c.id=t.course_id WHERE c.instructor_id=? ORDER BY t.created_at DESC').all(u.id)
        : db.prepare('SELECT * FROM threads ORDER BY created_at DESC').all();
    res.json({ threads: rows.map(threadOut) });
  });

  r.get('/courses/:id/threads', loadCourse('content'), (req, res) => {
    res.json({ threads: db.prepare('SELECT * FROM threads WHERE course_id=? ORDER BY created_at DESC').all(req.course.id).map(threadOut) });
  });

  r.post('/courses/:id/threads', loadCourse('content'), (req, res) => {
    const title = str(req.body.title, 150), body = str(req.body.body, 5000);
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!body) return res.status(400).json({ error: 'Message is required' });
    const id = newId('th');
    db.transaction(() => {
      db.prepare('INSERT INTO threads (id,course_id,author_id,title,created_at) VALUES (?,?,?,?,?)').run(id, req.course.id, req.user.id, title, now());
      db.prepare('INSERT INTO posts (id,thread_id,author_id,body,created_at) VALUES (?,?,?,?,?)').run(newId('p'), id, req.user.id, body, now());
      if (req.course.instructor_id !== req.user.id) notify(req.course.instructor_id, 'course', 'New discussion', `${req.user.name} started "${title}" in ${req.course.title}.`);
    })();
    req.log('Posted discussion', `${title} (${req.course.title})`);
    res.status(201).json({ thread: threadOut(db.prepare('SELECT * FROM threads WHERE id=?').get(id)) });
  });

  const loadThread = (needManageOrAuthor) => (req, res, next) => {
    const t = db.prepare('SELECT * FROM threads WHERE id=?').get(req.params.id), c = t && course(t.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Discussion not found' });
    if (!canAccessContent(req.user, c)) return res.status(403).json({ error: 'Enrol in this course to join its discussions' });
    if (needManageOrAuthor && !canManage(req.user, c) && t.author_id !== req.user.id) return res.status(403).json({ error: 'You do not have permission to do this' });
    req.thread = t; req.course = c; next();
  };

  r.get('/threads/:id', loadThread(false), (req, res) => res.json({ thread: threadOut(req.thread) }));

  r.post('/threads/:id/posts', loadThread(false), (req, res) => {
    const body = str(req.body.body, 5000);
    if (!body) return res.status(400).json({ error: 'Message is required' });
    const id = newId('p');
    db.transaction(() => {
      db.prepare('INSERT INTO posts (id,thread_id,author_id,body,created_at) VALUES (?,?,?,?,?)').run(id, req.thread.id, req.user.id, body, now());
      const targets = new Set([req.thread.author_id, req.course.instructor_id]);
      targets.delete(req.user.id);
      targets.forEach((uid) => notify(uid, 'course', 'New reply', `${req.user.name} replied to "${req.thread.title}".`));
    })();
    req.log('Replied to discussion', req.thread.title);
    res.status(201).json({ reply: postOut(db.prepare('SELECT * FROM posts WHERE id=?').get(id)) });
  });

  r.delete('/threads/:id', loadThread(true), (req, res) => {
    db.prepare('DELETE FROM threads WHERE id=?').run(req.thread.id);
    req.log('Deleted discussion', req.thread.title);
    res.json({ ok: true });
  });

  r.delete('/posts/:id', (req, res) => {
    const p = db.prepare('SELECT * FROM posts WHERE id=?').get(req.params.id);
    const t = p && db.prepare('SELECT * FROM threads WHERE id=?').get(p.thread_id), c = t && course(t.course_id);
    if (!c || !canSee(req.user, c) || !canAccessContent(req.user, c)) return res.status(404).json({ error: 'Post not found' });
    if (!canManage(req.user, c) && p.author_id !== req.user.id) return res.status(403).json({ error: 'You do not have permission to do this' });
    if (postsOf(t.id)[0].id === p.id) return res.status(409).json({ error: 'This is the opening post. Delete the whole discussion instead.' });
    db.prepare('DELETE FROM posts WHERE id=?').run(p.id);
    res.json({ ok: true });
  });

  // ================= Direct messages =================
  // Allowed pairs: admin <-> anyone; student <-> an instructor who teaches a course the student is enrolled in.
  const canMessage = (from, to) => {
    if (!to || !to.is_active || from.id === to.id) return false;
    if (from.role === 'admin' || to.role === 'admin') return true;
    const [stu, ins] = from.role === 'student' ? [from, to] : [to, from];
    if (stu.role !== 'student' || ins.role !== 'instructor') return false;
    return !!db.prepare('SELECT 1 FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.student_id=? AND c.instructor_id=?').get(stu.id, ins.id);
  };
  const msgOut = (m) => ({ id: m.id, fromId: m.from_id, fromName: (userRow(m.from_id) || {}).name || '', toId: m.to_id, toName: (userRow(m.to_id) || {}).name || '',
    subject: m.subject, body: m.body, sentAt: m.created_at, isRead: !!m.is_read });

  r.get('/contacts', (req, res) => {
    const all = db.prepare('SELECT id,name,role,is_active FROM users WHERE is_active=1 ORDER BY name').all();
    res.json({ contacts: all.filter((u) => canMessage(req.user, u)).map((u) => ({ id: u.id, name: u.name, role: u.role })) });
  });

  r.post('/messages', (req, res) => {
    const toId = str(req.body.toId, 60), subject = str(req.body.subject, 150), body = str(req.body.body, 5000);
    if (!body) return res.status(400).json({ error: 'Message is required' });
    const to = userRow(toId);
    if (!to || !canMessage(req.user, to)) return res.status(403).json({ error: 'You cannot message this user' });
    const id = newId('m');
    db.transaction(() => {
      db.prepare('INSERT INTO messages (id,from_id,to_id,subject,body,created_at) VALUES (?,?,?,?,?,?)').run(id, req.user.id, to.id, subject, body, now());
      notify(to.id, 'message', 'New message', `${req.user.name}: ${subject || body.slice(0, 60)}`);
    })();
    res.status(201).json({ message: msgOut(db.prepare('SELECT * FROM messages WHERE id=?').get(id)) });
  });

  r.get('/messages', (req, res) => {
    const sent = req.query.box === 'sent';
    const rows = db.prepare(`SELECT * FROM messages WHERE ${sent ? 'from_id' : 'to_id'}=? ORDER BY created_at DESC, rowid DESC LIMIT 200`).all(req.user.id);
    res.json({ messages: rows.map(msgOut), unreadCount: db.prepare('SELECT COUNT(*) c FROM messages WHERE to_id=? AND is_read=0').get(req.user.id).c });
  });

  const loadMsg = (req, res, next) => {
    const m = db.prepare('SELECT * FROM messages WHERE id=?').get(req.params.id);
    if (!m || (m.to_id !== req.user.id && m.from_id !== req.user.id)) return res.status(404).json({ error: 'Message not found' }); // participants only
    req.msg = m; next();
  };
  r.get('/messages/:id', loadMsg, (req, res) => {
    if (req.msg.to_id === req.user.id && !req.msg.is_read) { db.prepare('UPDATE messages SET is_read=1 WHERE id=?').run(req.msg.id); req.msg.is_read = 1; }
    res.json({ message: msgOut(req.msg) });
  });
  r.post('/messages/:id/read', loadMsg, (req, res) => {
    if (req.msg.to_id !== req.user.id) return res.status(403).json({ error: 'Only the recipient can mark a message as read' });
    db.prepare('UPDATE messages SET is_read=1 WHERE id=?').run(req.msg.id);
    res.json({ ok: true });
  });

  // ================= Notifications =================
  r.get('/notifications', (req, res) => {
    const rows = db.prepare(`SELECT * FROM notifications WHERE user_id=? ${req.query.unread === '1' ? 'AND is_read=0' : ''} ORDER BY created_at DESC, rowid DESC LIMIT 100`).all(req.user.id);
    res.json({
      notifications: rows.map((n) => ({ id: n.id, userId: n.user_id, type: n.type, title: n.title, body: n.body, isRead: !!n.is_read, createdAt: n.created_at })),
      unreadCount: db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id).c,
    });
  });
  r.post('/notifications/read-all', (req, res) => {
    res.json({ ok: true, updated: db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND is_read=0').run(req.user.id).changes });
  });
  r.post('/notifications/:id/read', (req, res) => {
    const info = db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
    res.status(info.changes ? 200 : 404).json(info.changes ? { ok: true } : { error: 'Notification not found' });
  });

  return r;
}

module.exports = { communicationRoutes };
