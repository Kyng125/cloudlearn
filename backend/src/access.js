// Shared access rules and serialisers for the academic and assessment routes.
const { newId, now } = require('./db');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isInt = (v) => Number.isInteger(v);
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

function makeAccess(db) {
  const course = (id) => db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  const canManage = (u, c) => u.role === 'admin' || (u.role === 'instructor' && c.instructor_id === u.id);
  const isEnrolled = (userId, courseId) => !!db.prepare('SELECT 1 FROM enrollments WHERE student_id=? AND course_id=?').get(userId, courseId);
  // Content (lessons, materials, assignments) is open to the course owner, admins and enrolled students.
  const canAccessContent = (u, c) => canManage(u, c) || (u.role === 'student' && isEnrolled(u.id, c.id));
  // Existence is visible when published, or the viewer manages it, or is already enrolled.
  const canSee = (u, c) => !!c.is_published || canManage(u, c) || (u.role === 'student' && isEnrolled(u.id, c.id));

  function notify(userId, type, title, body = '') {
    db.prepare('INSERT INTO notifications (id,user_id,type,title,body,created_at) VALUES (?,?,?,?,?,?)').run(newId('n'), userId, type, title, body, now());
  }

  // Express middleware factories: authorise BEFORE any upload is written to disk.
  const loadCourse = (rule) => (req, res, next) => {
    const c = course(req.params.id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Course not found' });
    if (rule === 'manage' && !canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    if (rule === 'content' && !canAccessContent(req.user, c)) return res.status(403).json({ error: 'Enrol in this course to access its content' });
    req.course = c;
    next();
  };

  const courseOut = (c, { modules = false, content = false } = {}) => {
    const instr = db.prepare('SELECT name FROM users WHERE id=?').get(c.instructor_id);
    const dur = db.prepare('SELECT COALESCE(SUM(l.duration_minutes),0) d FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=?').get(c.id).d;
    const out = {
      id: c.id, title: c.title, description: c.description, instructorId: c.instructor_id, instructorName: instr ? instr.name : '',
      category: c.category, level: c.level, thumbnail: c.thumbnail, isPublished: !!c.is_published, createdAt: c.created_at,
      durationMinutes: dur, enrolledCount: db.prepare('SELECT COUNT(*) c FROM enrollments WHERE course_id=?').get(c.id).c,
    };
    if (modules) {
      out.modules = db.prepare('SELECT * FROM modules WHERE course_id=? ORDER BY position').all(c.id).map((m) => ({
        id: m.id, courseId: c.id, title: m.title, order: m.position,
        lessons: db.prepare('SELECT * FROM lessons WHERE module_id=? ORDER BY position').all(m.id).map((l) => ({
          id: l.id, moduleId: m.id, title: l.title, type: l.type, durationMinutes: l.duration_minutes, order: l.position,
          content: content ? l.content : '', // lesson bodies are withheld from non-enrolled viewers
        })),
      }));
    }
    return out;
  };

  return { course, canManage, isEnrolled, canAccessContent, canSee, notify, loadCourse, courseOut };
}

module.exports = { makeAccess, str, isInt, LEVELS };
