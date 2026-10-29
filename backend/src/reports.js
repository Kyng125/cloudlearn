const express = require('express');
const { now } = require('./db');

// Cells that start with = + - @ are prefixed so spreadsheet software never evaluates them as formulas.
const cell = (v) => {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (columns, rows) => [columns.map((c) => cell(c.label)).join(','), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(','))].join('\r\n') + '\r\n';
const round1 = (n) => (n === null || n === undefined ? null : Math.round(n * 10) / 10);

function reportRoutes({ db, auth }) {
  const r = express.Router();
  r.use(auth.requireAuth);
  const mgr = auth.requireRole('instructor', 'admin');

  function send(req, res, name, title, columns, rows, summary) {
    req.log('Generated report', title);
    const generatedAt = now();
    if (req.query.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${name}-${generatedAt.slice(0, 10)}.csv"`);
      return res.send('﻿' + toCsv(columns, rows)); // BOM so Excel reads UTF-8 names correctly
    }
    res.json({ report: name, title, generatedAt, summary, columns, rows });
  }
  const scopedCourses = (u) => (u.role === 'admin' ? db.prepare('SELECT * FROM courses ORDER BY title').all()
    : db.prepare('SELECT * FROM courses WHERE instructor_id=? ORDER BY title').all(u.id));

  // ---- 1. Users (administrators only) ----
  r.get('/reports/users', auth.requireRole('admin'), (req, res) => {
    const users = db.prepare('SELECT * FROM users ORDER BY created_at, name').all();
    const rows = users.map((u) => ({
      name: u.name, email: u.email, role: u.role, status: u.is_active ? 'Active' : 'Inactive', joined: u.created_at.slice(0, 10),
      lastLogin: (db.prepare("SELECT at FROM activity_log WHERE user_id=? AND action='Logged in' ORDER BY id DESC LIMIT 1").get(u.id) || {}).at || '',
      courses: u.role === 'student' ? db.prepare('SELECT COUNT(*) c FROM enrollments WHERE student_id=?').get(u.id).c
        : u.role === 'instructor' ? db.prepare('SELECT COUNT(*) c FROM courses WHERE instructor_id=?').get(u.id).c : 0,
      submissions: db.prepare('SELECT COUNT(*) c FROM submissions WHERE student_id=?').get(u.id).c,
      quizAttempts: db.prepare('SELECT COUNT(*) c FROM attempts WHERE student_id=? AND completed_at IS NOT NULL').get(u.id).c,
    }));
    const summary = { total: rows.length, students: users.filter((u) => u.role === 'student').length, instructors: users.filter((u) => u.role === 'instructor').length,
      admins: users.filter((u) => u.role === 'admin').length, active: users.filter((u) => u.is_active).length, inactive: users.filter((u) => !u.is_active).length };
    send(req, res, 'users', 'User report', [
      { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'joined', label: 'Joined' },
      { key: 'lastLogin', label: 'Last login' }, { key: 'courses', label: 'Courses (enrolled or taught)' }, { key: 'submissions', label: 'Submissions' }, { key: 'quizAttempts', label: 'Quiz attempts' }], rows, summary);
  });

  // ---- 2. Course performance (admin: all courses; instructor: own courses) ----
  r.get('/reports/course-performance', mgr, (req, res) => {
    const rows = scopedCourses(req.user).map((c) => {
      const lessons = db.prepare('SELECT COUNT(*) c FROM lessons l JOIN modules m ON m.id=l.module_id WHERE m.course_id=?').get(c.id).c;
      const enr = db.prepare('SELECT student_id FROM enrollments WHERE course_id=?').all(c.id);
      const done = (sid) => db.prepare('SELECT COUNT(*) c FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id JOIN modules m ON m.id=l.module_id WHERE lp.student_id=? AND m.course_id=?').get(sid, c.id).c;
      const avgProgress = enr.length && lessons ? enr.reduce((a, e) => a + (done(e.student_id) / lessons) * 100, 0) / enr.length : null;
      const sub = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(s.is_late),0) late FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id=?').get(c.id);
      const gr = db.prepare('SELECT COUNT(*) n, AVG(g.score*100.0/a.max_points) pct FROM grades g JOIN submissions s ON s.id=g.submission_id JOIN assignments a ON a.id=s.assignment_id WHERE a.course_id=?').get(c.id);
      const qz = db.prepare('SELECT COUNT(*) n, AVG(t.score*100.0/t.total_points) pct, COALESCE(SUM(t.passed),0) passed FROM attempts t JOIN quizzes q ON q.id=t.quiz_id WHERE q.course_id=? AND t.completed_at IS NOT NULL AND t.total_points>0').get(c.id);
      return { course: c.title, instructor: (db.prepare('SELECT name FROM users WHERE id=?').get(c.instructor_id) || {}).name || '', status: c.is_published ? 'Published' : 'Draft',
        enrolled: enr.length, avgProgressPct: round1(avgProgress), assignments: db.prepare('SELECT COUNT(*) c FROM assignments WHERE course_id=?').get(c.id).c,
        submissions: sub.n, lateSubmissions: sub.late, gradedSubmissions: gr.n, avgGradePct: round1(gr.pct),
        quizzes: db.prepare('SELECT COUNT(*) c FROM quizzes WHERE course_id=?').get(c.id).c, quizAttempts: qz.n, avgQuizPct: round1(qz.pct),
        quizPassRatePct: qz.n ? round1((qz.passed / qz.n) * 100) : null };
    });
    const sum = (k) => rows.reduce((a, x) => a + x[k], 0);
    const summary = { courses: rows.length, enrolments: sum('enrolled'), submissions: sum('submissions'), lateSubmissions: sum('lateSubmissions'), gradedSubmissions: sum('gradedSubmissions'), quizAttempts: sum('quizAttempts') };
    send(req, res, 'course-performance', 'Course performance report', [
      { key: 'course', label: 'Course' }, { key: 'instructor', label: 'Instructor' }, { key: 'status', label: 'Status' }, { key: 'enrolled', label: 'Enrolled' },
      { key: 'avgProgressPct', label: 'Avg progress %' }, { key: 'assignments', label: 'Assignments' }, { key: 'submissions', label: 'Submissions' }, { key: 'lateSubmissions', label: 'Late' },
      { key: 'gradedSubmissions', label: 'Graded' }, { key: 'avgGradePct', label: 'Avg grade %' }, { key: 'quizzes', label: 'Quizzes' }, { key: 'quizAttempts', label: 'Quiz attempts' },
      { key: 'avgQuizPct', label: 'Avg quiz %' }, { key: 'quizPassRatePct', label: 'Quiz pass rate %' }], rows, summary);
  });

  // ---- 3. Assessment results (one row per assignment and per quiz/exam) ----
  r.get('/reports/assessment-results', mgr, (req, res) => {
    const courses = scopedCourses(req.user), rows = [];
    for (const c of courses) {
      for (const a of db.prepare('SELECT * FROM assignments WHERE course_id=? ORDER BY due_at').all(c.id)) {
        const s = db.prepare('SELECT COUNT(*) n, COALESCE(SUM(is_late),0) late FROM submissions WHERE assignment_id=?').get(a.id);
        const g = db.prepare('SELECT COUNT(*) n, AVG(g.score*100.0/?) avg, MAX(g.score*100.0/?) hi, MIN(g.score*100.0/?) lo FROM grades g JOIN submissions s ON s.id=g.submission_id WHERE s.assignment_id=?').get(a.max_points, a.max_points, a.max_points, a.id);
        rows.push({ course: c.title, type: 'Assignment', title: a.title, participants: s.n, late: s.late, graded: g.n, avgPct: round1(g.avg), highestPct: round1(g.hi), lowestPct: round1(g.lo), passRatePct: null });
      }
      for (const q of db.prepare('SELECT * FROM quizzes WHERE course_id=? ORDER BY created_at').all(c.id)) {
        const t = db.prepare('SELECT COUNT(*) n, COUNT(DISTINCT student_id) who, AVG(score*100.0/total_points) avg, MAX(score*100.0/total_points) hi, MIN(score*100.0/total_points) lo, COALESCE(SUM(passed),0) passed FROM attempts WHERE quiz_id=? AND completed_at IS NOT NULL AND total_points>0').get(q.id);
        rows.push({ course: c.title, type: q.is_exam ? 'Exam' : 'Quiz', title: q.title, participants: t.who, late: null, graded: t.n, avgPct: round1(t.avg), highestPct: round1(t.hi), lowestPct: round1(t.lo), passRatePct: t.n ? round1((t.passed / t.n) * 100) : null });
      }
    }
    const summary = { assessments: rows.length, assignments: rows.filter((x) => x.type === 'Assignment').length, quizzesAndExams: rows.filter((x) => x.type !== 'Assignment').length };
    send(req, res, 'assessment-results', 'Assessment results report', [
      { key: 'course', label: 'Course' }, { key: 'type', label: 'Type' }, { key: 'title', label: 'Title' }, { key: 'participants', label: 'Participants' }, { key: 'late', label: 'Late submissions' },
      { key: 'graded', label: 'Graded / completed attempts' }, { key: 'avgPct', label: 'Average %' }, { key: 'highestPct', label: 'Highest %' }, { key: 'lowestPct', label: 'Lowest %' }, { key: 'passRatePct', label: 'Pass rate %' }], rows, summary);
  });

  return r;
}

module.exports = { reportRoutes, toCsv };
