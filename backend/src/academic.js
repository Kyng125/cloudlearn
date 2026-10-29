const express = require('express');
const fs = require('fs');
const { newId, now } = require('./db');
const { str, isInt, LEVELS } = require('./access');

const LESSON_TYPES = ['video', 'document', 'presentation'];

function academicRoutes({ db, auth, access, uploads }) {
  const r = express.Router();
  const { course, canManage, canAccessContent, canSee, isEnrolled, loadCourse, courseOut, notify } = access;
  const cname = (u) => u.name;

  // ---------- Public catalogue (no sign-in) ----------
  r.get('/public/courses', (_req, res) => {
    res.json({ courses: db.prepare('SELECT * FROM courses WHERE is_published=1 ORDER BY created_at DESC').all().map((c) => courseOut(c)) });
  });

  const priv = express.Router();
  priv.use(auth.requireAuth);
  const mgr = auth.requireRole('instructor', 'admin');

  // ---------- Courses ----------
  priv.get('/courses', (req, res) => {
    const u = req.user;
    const rows = u.role === 'admin' ? db.prepare('SELECT * FROM courses ORDER BY created_at DESC').all()
      : u.role === 'instructor' ? db.prepare('SELECT * FROM courses WHERE instructor_id=? ORDER BY created_at DESC').all(u.id)
        : db.prepare('SELECT * FROM courses WHERE is_published=1 OR id IN (SELECT course_id FROM enrollments WHERE student_id=?) ORDER BY created_at DESC').all(u.id);
    res.json({ courses: rows.map((c) => ({ ...courseOut(c), enrolled: u.role === 'student' ? isEnrolled(u.id, c.id) : undefined })) });
  });

  priv.post('/courses', mgr, (req, res) => {
    const b = req.body, title = str(b.title, 150);
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const level = b.level === undefined ? 'Beginner' : b.level;
    if (!LEVELS.includes(level)) return res.status(400).json({ error: 'Level must be Beginner, Intermediate or Advanced' });
    let instructorId = req.user.id;
    if (req.user.role === 'admin') {
      instructorId = str(b.instructorId, 60);
      const ins = db.prepare("SELECT id FROM users WHERE id=? AND role='instructor' AND is_active=1").get(instructorId);
      if (!ins) return res.status(400).json({ error: 'An active instructor is required (instructorId)' });
    }
    const id = newId('c');
    db.prepare('INSERT INTO courses (id,title,description,instructor_id,category,level,thumbnail,is_published,created_at) VALUES (?,?,?,?,?,?,?,0,?)')
      .run(id, title, str(b.description, 4000), instructorId, str(b.category, 60), level, str(b.thumbnail, 500), now());
    req.log('Created course', title);
    res.status(201).json({ course: courseOut(course(id), { modules: true, content: true }) });
  });

  priv.get('/courses/:id', loadCourse(), (req, res) => {
    res.json({ course: courseOut(req.course, { modules: true, content: canAccessContent(req.user, req.course) }) });
  });

  priv.patch('/courses/:id', loadCourse('manage'), (req, res) => {
    const c = req.course, b = req.body;
    if (b.level !== undefined && !LEVELS.includes(b.level)) return res.status(400).json({ error: 'Invalid level' });
    if (b.title !== undefined && !str(b.title, 150)) return res.status(400).json({ error: 'Title cannot be empty' });
    if (b.isPublished !== undefined && typeof b.isPublished !== 'boolean') return res.status(400).json({ error: 'isPublished must be true or false' });
    db.prepare('UPDATE courses SET title=?, description=?, category=?, level=?, thumbnail=?, is_published=? WHERE id=?').run(
      b.title === undefined ? c.title : str(b.title, 150), b.description === undefined ? c.description : str(b.description, 4000),
      b.category === undefined ? c.category : str(b.category, 60), b.level === undefined ? c.level : b.level,
      b.thumbnail === undefined ? c.thumbnail : str(b.thumbnail, 500), b.isPublished === undefined ? c.is_published : (b.isPublished ? 1 : 0), c.id);
    if (b.isPublished !== undefined && b.isPublished !== !!c.is_published) req.log(b.isPublished ? 'Published course' : 'Unpublished course', c.title);
    res.json({ course: courseOut(course(c.id), { modules: true, content: true }) });
  });

  priv.delete('/courses/:id', loadCourse('manage'), (req, res) => {
    if (db.prepare('SELECT COUNT(*) c FROM enrollments WHERE course_id=?').get(req.course.id).c > 0) {
      return res.status(409).json({ error: 'This course has enrolled students. Unpublish it instead of deleting.' });
    }
    const files = db.prepare('SELECT stored_name FROM materials WHERE course_id=?').all(req.course.id);
    db.prepare('DELETE FROM courses WHERE id=?').run(req.course.id);
    files.forEach((f) => uploads.remove(f.stored_name));
    req.log('Deleted course', req.course.title);
    res.json({ ok: true });
  });

  // ---------- Modules and lessons ----------
  const nextPos = (table, col, id) => db.prepare(`SELECT COALESCE(MAX(position),-1)+1 p FROM ${table} WHERE ${col}=?`).get(id).p;

  priv.post('/courses/:id/modules', loadCourse('manage'), (req, res) => {
    const title = str(req.body.title, 150);
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const id = newId('m');
    db.prepare('INSERT INTO modules (id,course_id,title,position) VALUES (?,?,?,?)').run(id, req.course.id, title, nextPos('modules', 'course_id', req.course.id));
    res.status(201).json({ module: { id, courseId: req.course.id, title, lessons: [] } });
  });

  const loadModule = (req, res, next) => {
    const m = db.prepare('SELECT * FROM modules WHERE id=?').get(req.params.id);
    const c = m && course(m.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Module not found' });
    if (!canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    req.module = m; req.course = c; next();
  };
  priv.patch('/modules/:id', loadModule, (req, res) => {
    const title = str(req.body.title, 150);
    if (!title) return res.status(400).json({ error: 'Title is required' });
    db.prepare('UPDATE modules SET title=? WHERE id=?').run(title, req.module.id);
    res.json({ ok: true });
  });
  priv.delete('/modules/:id', loadModule, (req, res) => { db.prepare('DELETE FROM modules WHERE id=?').run(req.module.id); res.json({ ok: true }); });

  priv.post('/modules/:id/lessons', loadModule, (req, res) => {
    const b = req.body, title = str(b.title, 150), type = b.type === undefined ? 'document' : b.type;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!LESSON_TYPES.includes(type)) return res.status(400).json({ error: 'Lesson type must be video, document or presentation' });
    const dur = b.durationMinutes === undefined ? 0 : b.durationMinutes;
    if (!isInt(dur) || dur < 0 || dur > 600) return res.status(400).json({ error: 'durationMinutes must be 0 to 600' });
    const id = newId('l');
    db.prepare('INSERT INTO lessons (id,module_id,title,type,content,duration_minutes,position) VALUES (?,?,?,?,?,?,?)')
      .run(id, req.module.id, title, type, str(b.content, 20000), dur, nextPos('lessons', 'module_id', req.module.id));
    res.status(201).json({ lesson: { id, moduleId: req.module.id, title, type, durationMinutes: dur } });
  });

  const loadLesson = (needManage) => (req, res, next) => {
    const l = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id);
    const m = l && db.prepare('SELECT * FROM modules WHERE id=?').get(l.module_id);
    const c = m && course(m.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Lesson not found' });
    if (needManage && !canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    req.lesson = l; req.course = c; next();
  };
  priv.patch('/lessons/:id', loadLesson(true), (req, res) => {
    const l = req.lesson, b = req.body;
    if (b.type !== undefined && !LESSON_TYPES.includes(b.type)) return res.status(400).json({ error: 'Invalid lesson type' });
    if (b.title !== undefined && !str(b.title, 150)) return res.status(400).json({ error: 'Title cannot be empty' });
    if (b.durationMinutes !== undefined && (!isInt(b.durationMinutes) || b.durationMinutes < 0 || b.durationMinutes > 600)) return res.status(400).json({ error: 'durationMinutes must be 0 to 600' });
    db.prepare('UPDATE lessons SET title=?, type=?, content=?, duration_minutes=? WHERE id=?').run(
      b.title === undefined ? l.title : str(b.title, 150), b.type === undefined ? l.type : b.type,
      b.content === undefined ? l.content : str(b.content, 20000), b.durationMinutes === undefined ? l.duration_minutes : b.durationMinutes, l.id);
    res.json({ ok: true });
  });
  priv.delete('/lessons/:id', loadLesson(true), (req, res) => { db.prepare('DELETE FROM lessons WHERE id=?').run(req.lesson.id); res.json({ ok: true }); });

  // ---------- Materials (TC04) ----------
  const materialOut = (m) => ({ id: m.id, courseId: m.course_id, fileName: m.file_name, mimeType: m.mime_type, sizeBytes: m.size_bytes, createdAt: m.created_at, uploadedBy: m.uploaded_by });

  priv.post('/courses/:id/materials', loadCourse('manage'), uploads.upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'A file is required (form field "file")' });
    const id = newId('mat');
    try {
      db.prepare('INSERT INTO materials (id,course_id,uploaded_by,file_name,stored_name,mime_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, req.course.id, req.user.id, uploads.cleanName(req.file.originalname), req.file.filename, req.file.mimetype || 'application/octet-stream', req.file.size, now());
    } catch (e) { uploads.remove(req.file.filename); throw e; } // never leave an orphan file behind a failed record
    req.log('Uploaded material', `${uploads.cleanName(req.file.originalname)} to ${req.course.title}`);
    res.status(201).json({ material: materialOut(db.prepare('SELECT * FROM materials WHERE id=?').get(id)) });
  });

  priv.get('/courses/:id/materials', loadCourse('content'), (req, res) => {
    res.json({ materials: db.prepare('SELECT * FROM materials WHERE course_id=? ORDER BY created_at DESC').all(req.course.id).map(materialOut) });
  });

  priv.get('/materials/:id/download', (req, res) => {
    const m = db.prepare('SELECT * FROM materials WHERE id=?').get(req.params.id);
    const c = m && course(m.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'File not found' });
    if (!canAccessContent(req.user, c)) return res.status(403).json({ error: 'Enrol in this course to access its content' });
    const p = uploads.pathFor(m.stored_name);
    if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'File not found' });
    res.download(p, m.file_name); // forced attachment: uploaded HTML can never run in our origin
  });

  priv.delete('/materials/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM materials WHERE id=?').get(req.params.id);
    const c = m && course(m.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'File not found' });
    if (!canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    db.prepare('DELETE FROM materials WHERE id=?').run(m.id); uploads.remove(m.stored_name);
    res.json({ ok: true });
  });

  // ---------- Enrolment (TC05) and progress ----------
  const progressFor = (studentId, courseId) => {
    const total = db.prepare('SELECT COUNT(*) c FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=?').get(courseId).c;
    const done = db.prepare('SELECT lp.lesson_id FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id JOIN modules m ON m.id=l.module_id WHERE lp.student_id=? AND m.course_id=?').all(studentId, courseId).map((x) => x.lesson_id);
    return { completedLessons: done, totalLessons: total, progress: total ? Math.round((done.length / total) * 100) : 0 };
  };
  const enrolmentOut = (e) => ({ id: e.id, studentId: e.student_id, courseId: e.course_id, enrolledAt: e.enrolled_at, ...progressFor(e.student_id, e.course_id) });

  priv.post('/courses/:id/enroll', auth.requireRole('student'), (req, res) => {
    const c = course(req.params.id);
    if (!c || !c.is_published) return res.status(404).json({ error: 'Course not found' });
    if (isEnrolled(req.user.id, c.id)) return res.status(409).json({ error: 'You are already enrolled in this course' });
    const id = newId('e');
    db.prepare('INSERT INTO enrollments (id,student_id,course_id,enrolled_at) VALUES (?,?,?,?)').run(id, req.user.id, c.id, now());
    notify(c.instructor_id, 'course', 'New enrolment', `${cname(req.user)} enrolled in ${c.title}.`);
    req.log('Enrolled in course', c.title);
    res.status(201).json({ enrollment: enrolmentOut(db.prepare('SELECT * FROM enrollments WHERE id=?').get(id)) });
  });

  priv.get('/enrollments', (req, res) => {
    const u = req.user;
    const rows = u.role === 'student' ? db.prepare('SELECT * FROM enrollments WHERE student_id=? ORDER BY enrolled_at DESC').all(u.id)
      : u.role === 'instructor' ? db.prepare('SELECT e.* FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=? ORDER BY e.enrolled_at DESC').all(u.id)
        : db.prepare('SELECT * FROM enrollments ORDER BY enrolled_at DESC').all();
    res.json({ enrollments: rows.map(enrolmentOut) });
  });

  priv.get('/courses/:id/students', loadCourse('manage'), (req, res) => {
    const rows = db.prepare('SELECT e.*, u.name, u.email FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.course_id=? ORDER BY u.name').all(req.course.id);
    res.json({ students: rows.map((e) => ({ ...enrolmentOut(e), name: e.name, email: e.email })) });
  });

  priv.post('/lessons/:id/complete', auth.requireRole('student'), loadLesson(false), (req, res) => {
    if (!isEnrolled(req.user.id, req.course.id)) return res.status(403).json({ error: 'Enrol in this course first' });
    db.prepare('INSERT OR IGNORE INTO lesson_progress (student_id,lesson_id,completed_at) VALUES (?,?,?)').run(req.user.id, req.lesson.id, now());
    res.json(progressFor(req.user.id, req.course.id));
  });

  priv.get('/courses/:id/progress', auth.requireRole('student'), loadCourse('content'), (req, res) => res.json(progressFor(req.user.id, req.course.id)));

  r.use(priv);
  return r;
}

module.exports = { academicRoutes };
