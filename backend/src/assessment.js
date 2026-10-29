const express = require('express');
const fs = require('fs');
const { newId, now } = require('./db');
const { str, isInt } = require('./access');

function assessmentRoutes({ db, auth, access, uploads, config }) {
  const r = express.Router();
  r.use(auth.requireAuth);
  const { course, canManage, canAccessContent, canSee, isEnrolled, notify } = access;
  const mgr = auth.requireRole('instructor', 'admin');
  const isoOk = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

  // ================= Assignments =================
  const assignmentRow = (id) => db.prepare('SELECT * FROM assignments WHERE id=?').get(id);
  const subOut = (s) => {
    const g = db.prepare('SELECT * FROM grades WHERE submission_id=?').get(s.id);
    const stu = db.prepare('SELECT name FROM users WHERE id=?').get(s.student_id);
    return { id: s.id, assignmentId: s.assignment_id, studentId: s.student_id, studentName: stu ? stu.name : '', content: s.content, fileName: s.file_name,
      submittedAt: s.submitted_at, isLate: !!s.is_late, grade: g ? g.score : null, feedback: g ? g.feedback : null, status: g ? 'graded' : 'submitted' };
  };
  const assignmentOut = (a, user) => {
    const c = course(a.course_id);
    const out = { id: a.id, courseId: a.course_id, courseTitle: c.title, instructorId: c.instructor_id, title: a.title, description: a.description,
      dueDate: a.due_at, maxPoints: a.max_points, createdAt: a.created_at };
    if (user.role === 'student') {
      const s = db.prepare('SELECT * FROM submissions WHERE assignment_id=? AND student_id=?').get(a.id, user.id);
      out.submission = s ? subOut(s) : null;
    } else {
      out.submissionCount = db.prepare('SELECT COUNT(*) c FROM submissions WHERE assignment_id=?').get(a.id).c;
      out.gradedCount = db.prepare('SELECT COUNT(*) c FROM grades g JOIN submissions s ON s.id=g.submission_id WHERE s.assignment_id=?').get(a.id).c;
    }
    return out;
  };

  r.get('/assignments', (req, res) => {
    const u = req.user;
    const rows = u.role === 'student' ? db.prepare('SELECT a.* FROM assignments a WHERE a.course_id IN (SELECT course_id FROM enrollments WHERE student_id=?) ORDER BY a.due_at').all(u.id)
      : u.role === 'instructor' ? db.prepare('SELECT a.* FROM assignments a JOIN courses c ON c.id=a.course_id WHERE c.instructor_id=? ORDER BY a.due_at').all(u.id)
        : db.prepare('SELECT * FROM assignments ORDER BY due_at').all();
    res.json({ assignments: rows.map((a) => assignmentOut(a, u)) });
  });

  const loadCourseFor = (rule) => (req, res, next) => {
    const c = course(req.params.id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Course not found' });
    if (rule === 'manage' && !canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    if (rule === 'content' && !canAccessContent(req.user, c)) return res.status(403).json({ error: 'Enrol in this course to access its content' });
    req.course = c; next();
  };

  r.post('/courses/:id/assignments', mgr, loadCourseFor('manage'), (req, res) => {
    const b = req.body, title = str(b.title, 150), max = b.maxPoints === undefined ? 100 : b.maxPoints;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!isoOk(b.dueDate)) return res.status(400).json({ error: 'dueDate must be a valid date' });
    if (!isInt(max) || max < 1 || max > 1000) return res.status(400).json({ error: 'maxPoints must be 1 to 1000' });
    const id = newId('a');
    db.prepare('INSERT INTO assignments (id,course_id,title,description,due_at,max_points,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(id, req.course.id, title, str(b.description, 4000), new Date(b.dueDate).toISOString(), max, now());
    db.prepare('SELECT student_id FROM enrollments WHERE course_id=?').all(req.course.id)
      .forEach((e) => notify(e.student_id, 'assignment', 'New assignment', `"${title}" was posted in ${req.course.title}.`));
    res.status(201).json({ assignment: assignmentOut(assignmentRow(id), req.user) });
  });

  r.get('/courses/:id/assignments', loadCourseFor('content'), (req, res) => {
    res.json({ assignments: db.prepare('SELECT * FROM assignments WHERE course_id=? ORDER BY due_at').all(req.course.id).map((a) => assignmentOut(a, req.user)) });
  });

  // Submission (TC06 on time, TC07 late). Authorise and validate BEFORE the file is written to disk.
  const preSubmit = (req, res, next) => {
    const a = assignmentRow(req.params.id);
    const c = a && course(a.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Assignment not found' });
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can submit assignments' });
    if (!isEnrolled(req.user.id, c.id)) return res.status(403).json({ error: 'Enrol in this course to submit work' });
    const prev = db.prepare('SELECT s.id FROM submissions s JOIN grades g ON g.submission_id=s.id WHERE s.assignment_id=? AND s.student_id=?').get(a.id, req.user.id);
    if (prev) return res.status(409).json({ error: 'This submission has already been graded and can no longer be replaced' });
    req.assignment = a; req.course = c; next();
  };
  r.post('/assignments/:id/submit', preSubmit, uploads.upload.single('file'), (req, res) => {
    const a = req.assignment, content = str(req.body && req.body.content, 5000);
    if (!req.file) return res.status(400).json({ error: 'A file is required (form field "file")' });
    const late = Date.now() > new Date(a.due_at).getTime() ? 1 : 0;
    const prior = db.prepare('SELECT * FROM submissions WHERE assignment_id=? AND student_id=?').get(a.id, req.user.id);
    let id;
    try {
      db.transaction(() => {
        if (prior) {
          id = prior.id;
          db.prepare('UPDATE submissions SET content=?, file_name=?, stored_name=?, submitted_at=?, is_late=? WHERE id=?')
            .run(content, uploads.cleanName(req.file.originalname), req.file.filename, now(), late, id);
        } else {
          id = newId('s');
          db.prepare('INSERT INTO submissions (id,assignment_id,student_id,content,file_name,stored_name,submitted_at,is_late) VALUES (?,?,?,?,?,?,?,?)')
            .run(id, a.id, req.user.id, content, uploads.cleanName(req.file.originalname), req.file.filename, now(), late);
        }
        notify(req.course.instructor_id, 'submission', 'New submission', `${req.user.name} submitted "${a.title}"${late ? ' (late)' : ''}.`);
      })();
    } catch (e) { uploads.remove(req.file.filename); throw e; } // failed record leaves no orphan file
    if (prior) uploads.remove(prior.stored_name);
    res.status(201).json({ submission: subOut(db.prepare('SELECT * FROM submissions WHERE id=?').get(id)) });
  });

  r.get('/assignments/:id/submissions', (req, res) => {
    const a = assignmentRow(req.params.id), c = a && course(a.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Assignment not found' });
    if (!canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' });
    res.json({ submissions: db.prepare('SELECT * FROM submissions WHERE assignment_id=? ORDER BY submitted_at').all(a.id).map(subOut) });
  });

  const loadSub = (req, res, next) => {
    const s = db.prepare('SELECT * FROM submissions WHERE id=?').get(req.params.id);
    const a = s && assignmentRow(s.assignment_id), c = a && course(a.course_id);
    if (!c) return res.status(404).json({ error: 'Submission not found' });
    const mine = req.user.role === 'student' && s.student_id === req.user.id;
    if (!mine && !canManage(req.user, c)) return res.status(404).json({ error: 'Submission not found' }); // no existence leak
    req.sub = s; req.assignment = a; req.course = c; next();
  };

  r.get('/submissions/:id/download', loadSub, (req, res) => {
    const p = uploads.pathFor(req.sub.stored_name);
    if (!p || !fs.existsSync(p)) return res.status(404).json({ error: 'File not found' });
    res.download(p, req.sub.file_name);
  });

  // Grading (TC08)
  r.put('/submissions/:id/grade', mgr, loadSub, (req, res) => {
    const { score, feedback } = req.body, max = req.assignment.max_points;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > max) return res.status(400).json({ error: `Score must be a number from 0 to ${max}` });
    db.transaction(() => {
      db.prepare(`INSERT INTO grades (submission_id,score,feedback,graded_by,graded_at) VALUES (?,?,?,?,?)
        ON CONFLICT(submission_id) DO UPDATE SET score=excluded.score, feedback=excluded.feedback, graded_by=excluded.graded_by, graded_at=excluded.graded_at`)
        .run(req.sub.id, score, str(feedback, 4000), req.user.id, now());
      notify(req.sub.student_id, 'grade', 'Assignment graded', `Your "${req.assignment.title}" scored ${score}/${max}.`);
    })();
    res.json({ submission: subOut(req.sub) });
  });

  // ================= Quizzes =================
  const quizRow = (id) => db.prepare('SELECT * FROM quizzes WHERE id=?').get(id);
  const questionsOf = (quizId) => db.prepare('SELECT * FROM questions WHERE quiz_id=? ORDER BY position').all(quizId);
  const qOut = (q, withAnswer) => ({ id: q.id, quizId: q.quiz_id, text: q.text, options: JSON.parse(q.options_json), points: q.points,
    ...(withAnswer ? { correctIndex: q.correct_index, explanation: q.explanation } : {}) });
  const quizOut = (q, user, { questions = false } = {}) => {
    const c = course(q.course_id), qs = questionsOf(q.id);
    const out = { id: q.id, courseId: q.course_id, courseTitle: c.title, instructorId: c.instructor_id, title: q.title, description: q.description,
      duration: q.duration_minutes, passingScore: q.passing_score, isExam: !!q.is_exam, isPublished: !!q.is_published, createdAt: q.created_at,
      questionCount: qs.length, totalPoints: qs.reduce((a, x) => a + x.points, 0) };
    if (user.role === 'student') {
      const done = db.prepare('SELECT * FROM attempts WHERE quiz_id=? AND student_id=? AND completed_at IS NOT NULL ORDER BY completed_at DESC').all(q.id, user.id);
      out.attemptCount = done.length;
      out.lastAttempt = done[0] ? { id: done[0].id, score: done[0].score, totalPoints: done[0].total_points, passed: !!done[0].passed, completedAt: done[0].completed_at } : null;
    } else {
      out.attemptCount = db.prepare('SELECT COUNT(*) c FROM attempts WHERE quiz_id=? AND completed_at IS NOT NULL').get(q.id).c;
      if (questions) out.questions = qs.map((x) => qOut(x, true));
    }
    return out;
  };

  r.get('/quizzes', (req, res) => {
    const u = req.user;
    const rows = u.role === 'student' ? db.prepare('SELECT * FROM quizzes WHERE is_published=1 AND course_id IN (SELECT course_id FROM enrollments WHERE student_id=?) ORDER BY created_at DESC').all(u.id)
      : u.role === 'instructor' ? db.prepare('SELECT q.* FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE c.instructor_id=? ORDER BY q.created_at DESC').all(u.id)
        : db.prepare('SELECT * FROM quizzes ORDER BY created_at DESC').all();
    res.json({ quizzes: rows.map((q) => quizOut(q, u)) });
  });

  const loadQuiz = (rule) => (req, res, next) => {
    const q = quizRow(req.params.id), c = q && course(q.course_id);
    if (!c || !canSee(req.user, c)) return res.status(404).json({ error: 'Quiz not found' });
    if (rule === 'manage') { if (!canManage(req.user, c)) return res.status(403).json({ error: 'You do not have permission to do this' }); }
    else if (!canManage(req.user, c) && !(q.is_published && req.user.role === 'student' && isEnrolled(req.user.id, c.id))) return res.status(404).json({ error: 'Quiz not found' });
    req.quiz = q; req.course = c; next();
  };

  r.get('/quizzes/:id', loadQuiz(), (req, res) => res.json({ quiz: quizOut(req.quiz, req.user, { questions: true }) }));

  function validateQuestions(list) {
    if (!Array.isArray(list) || list.length < 1 || list.length > 100) return 'A quiz needs 1 to 100 questions';
    for (const [i, q] of list.entries()) {
      const n = i + 1;
      if (!q || !str(q.text, 500)) return `Question ${n} needs text`;
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6 || q.options.some((o) => !str(o, 200))) return `Question ${n} needs 2 to 6 non-empty options`;
      if (!isInt(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.options.length) return `Question ${n} has an invalid correct answer`;
      if (q.points !== undefined && (!isInt(q.points) || q.points < 1 || q.points > 100)) return `Question ${n} points must be 1 to 100`;
    }
    return null;
  }

  r.post('/courses/:id/quizzes', mgr, loadCourseFor('manage'), (req, res) => {
    const b = req.body, title = str(b.title, 150), dur = b.durationMinutes === undefined ? 15 : b.durationMinutes, pass = b.passingScore === undefined ? 50 : b.passingScore;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!isInt(dur) || dur < 1 || dur > 300) return res.status(400).json({ error: 'durationMinutes must be 1 to 300' });
    if (!isInt(pass) || pass < 0 || pass > 100) return res.status(400).json({ error: 'passingScore must be 0 to 100' });
    const err = validateQuestions(b.questions);
    if (err) return res.status(400).json({ error: err });
    const id = newId('qz');
    db.transaction(() => {
      db.prepare('INSERT INTO quizzes (id,course_id,title,description,duration_minutes,passing_score,is_exam,is_published,created_at) VALUES (?,?,?,?,?,?,?,0,?)')
        .run(id, req.course.id, title, str(b.description, 2000), dur, pass, b.isExam ? 1 : 0, now());
      b.questions.forEach((q, i) => db.prepare('INSERT INTO questions (id,quiz_id,text,options_json,correct_index,points,explanation,position) VALUES (?,?,?,?,?,?,?,?)')
        .run(newId('q'), id, str(q.text, 500), JSON.stringify(q.options.map((o) => str(o, 200))), q.correctIndex, q.points || 1, str(q.explanation, 1000), i));
    })();
    res.status(201).json({ quiz: quizOut(quizRow(id), req.user, { questions: true }) });
  });

  r.patch('/quizzes/:id', loadQuiz('manage'), (req, res) => {
    const q = req.quiz, b = req.body;
    if (b.title !== undefined && !str(b.title, 150)) return res.status(400).json({ error: 'Title cannot be empty' });
    if (b.durationMinutes !== undefined && (!isInt(b.durationMinutes) || b.durationMinutes < 1 || b.durationMinutes > 300)) return res.status(400).json({ error: 'durationMinutes must be 1 to 300' });
    if (b.passingScore !== undefined && (!isInt(b.passingScore) || b.passingScore < 0 || b.passingScore > 100)) return res.status(400).json({ error: 'passingScore must be 0 to 100' });
    if (b.isPublished !== undefined && typeof b.isPublished !== 'boolean') return res.status(400).json({ error: 'isPublished must be true or false' });
    db.prepare('UPDATE quizzes SET title=?, description=?, duration_minutes=?, passing_score=?, is_published=? WHERE id=?').run(
      b.title === undefined ? q.title : str(b.title, 150), b.description === undefined ? q.description : str(b.description, 2000),
      b.durationMinutes === undefined ? q.duration_minutes : b.durationMinutes, b.passingScore === undefined ? q.passing_score : b.passingScore,
      b.isPublished === undefined ? q.is_published : (b.isPublished ? 1 : 0), q.id);
    if (b.isPublished === true && !q.is_published) {
      db.prepare('SELECT student_id FROM enrollments WHERE course_id=?').all(q.course_id)
        .forEach((e) => notify(e.student_id, 'quiz', 'New quiz available', `"${q.title}" is now available in ${req.course.title}.`));
    }
    res.json({ quiz: quizOut(quizRow(q.id), req.user, { questions: true }) });
  });

  r.delete('/quizzes/:id', loadQuiz('manage'), (req, res) => {
    if (db.prepare('SELECT COUNT(*) c FROM attempts WHERE quiz_id=?').get(req.quiz.id).c > 0) return res.status(409).json({ error: 'This quiz has attempts. Unpublish it instead of deleting.' });
    db.prepare('DELETE FROM quizzes WHERE id=?').run(req.quiz.id);
    res.json({ ok: true });
  });

  // ---- Attempts: the server owns the clock and the answer key ----
  const deadlineOf = (att, quiz) => new Date(new Date(att.started_at).getTime() + quiz.duration_minutes * 60000);
  const expired = (att, quiz) => Date.now() > deadlineOf(att, quiz).getTime() + config.quizGraceSec * 1000;

  // Scores the answers saved so far and closes the attempt. Idempotent.
  function finalize(att, quiz) {
    if (att.completed_at) return att;
    const qs = questionsOf(quiz.id), saved = JSON.parse(att.answers_json);
    let score = 0; const total = qs.reduce((a, q) => a + q.points, 0);
    const answers = qs.map((q, i) => (isInt(saved[i]) ? saved[i] : -1));
    qs.forEach((q, i) => { if (answers[i] === q.correct_index) score += q.points; });
    const done = new Date(Math.min(Date.now(), deadlineOf(att, quiz).getTime())).toISOString();
    db.prepare('UPDATE attempts SET completed_at=?, answers_json=?, score=?, total_points=?, passed=? WHERE id=? AND completed_at IS NULL')
      .run(done, JSON.stringify(answers), score, total, score >= (total * quiz.passing_score) / 100 ? 1 : 0, att.id);
    return db.prepare('SELECT * FROM attempts WHERE id=?').get(att.id);
  }
  const attemptOut = (att, quiz, { review = false } = {}) => {
    const out = { id: att.id, quizId: att.quiz_id, studentId: att.student_id, startedAt: att.started_at, deadline: deadlineOf(att, quiz).toISOString(),
      status: att.completed_at ? 'completed' : 'in_progress', answers: JSON.parse(att.answers_json) };
    if (att.completed_at) {
      Object.assign(out, { completedAt: att.completed_at, score: att.score, totalPoints: att.total_points, passed: !!att.passed,
        timeTaken: Math.round((new Date(att.completed_at) - new Date(att.started_at)) / 1000) });
      if (review) out.review = questionsOf(quiz.id).map((q, i) => ({ ...qOut(q, true), yourAnswer: out.answers[i] }));
    }
    return out;
  };
  const loadAttempt = (req, res, next) => {
    const att = db.prepare('SELECT * FROM attempts WHERE id=?').get(req.params.id);
    const quiz = att && quizRow(att.quiz_id), c = quiz && course(quiz.course_id);
    if (!c) return res.status(404).json({ error: 'Attempt not found' });
    const mine = req.user.role === 'student' && att.student_id === req.user.id;
    if (!mine && !canManage(req.user, c)) return res.status(404).json({ error: 'Attempt not found' });
    req.mine = mine; req.quiz = quiz;
    req.att = expired(att, quiz) ? finalize(att, quiz) : att; // time is up: close it with what was saved
    next();
  };

  r.post('/quizzes/:id/attempts', auth.requireRole('student'), loadQuiz(), (req, res) => {
    const quiz = req.quiz;
    const open = db.prepare('SELECT * FROM attempts WHERE quiz_id=? AND student_id=? AND completed_at IS NULL').get(quiz.id, req.user.id);
    let att = open;
    if (open && expired(open, quiz)) { finalize(open, quiz); att = null; }
    if (!att) {
      if (quiz.is_exam && db.prepare('SELECT 1 FROM attempts WHERE quiz_id=? AND student_id=?').get(quiz.id, req.user.id)) return res.status(409).json({ error: 'This exam allows a single attempt' });
      const id = newId('at');
      db.prepare('INSERT INTO attempts (id,quiz_id,student_id,started_at) VALUES (?,?,?,?)').run(id, quiz.id, req.user.id, now());
      att = db.prepare('SELECT * FROM attempts WHERE id=?').get(id);
    }
    res.status(open && att.id === open.id ? 200 : 201).json({ attempt: attemptOut(att, quiz), questions: questionsOf(quiz.id).map((q) => qOut(q, false)), serverTime: now() });
  });

  const cleanAnswers = (quiz, answers) => {
    const qs = questionsOf(quiz.id);
    if (!Array.isArray(answers) || answers.length > qs.length) return null;
    const out = qs.map((_q, i) => (answers[i] === undefined || answers[i] === null ? -1 : answers[i]));
    return out.every((a, i) => a === -1 || (isInt(a) && a >= 0 && a < JSON.parse(qs[i].options_json).length)) ? out : null;
  };

  r.put('/attempts/:id/answers', auth.requireRole('student'), loadAttempt, (req, res) => {
    if (!req.mine) return res.status(403).json({ error: 'You do not have permission to do this' });
    if (req.att.completed_at) return res.status(409).json({ error: 'Time is up or the attempt is already submitted', attempt: attemptOut(req.att, req.quiz) });
    const answers = cleanAnswers(req.quiz, req.body.answers);
    if (!answers) return res.status(400).json({ error: 'Invalid answers' });
    db.prepare('UPDATE attempts SET answers_json=? WHERE id=?').run(JSON.stringify(answers), req.att.id);
    res.json({ ok: true, saved: answers.filter((a) => a !== -1).length });
  });

  r.post('/attempts/:id/submit', auth.requireRole('student'), loadAttempt, (req, res) => {
    if (!req.mine) return res.status(403).json({ error: 'You do not have permission to do this' });
    let att = req.att;
    if (!att.completed_at) {
      if (req.body && req.body.answers !== undefined) { // accepted only while the clock is still running
        const answers = cleanAnswers(req.quiz, req.body.answers);
        if (!answers) return res.status(400).json({ error: 'Invalid answers' });
        db.prepare('UPDATE attempts SET answers_json=? WHERE id=? AND completed_at IS NULL').run(JSON.stringify(answers), att.id);
        att = db.prepare('SELECT * FROM attempts WHERE id=?').get(att.id);
      }
      att = finalize(att, req.quiz);
    }
    res.json({ attempt: attemptOut(att, req.quiz, { review: true }) });
  });

  r.get('/attempts/:id', loadAttempt, (req, res) => res.json({ attempt: attemptOut(req.att, req.quiz, { review: true }) }));

  r.get('/quizzes/:id/attempts', loadQuiz(), (req, res) => {
    const mine = req.user.role === 'student';
    const rows = mine ? db.prepare('SELECT * FROM attempts WHERE quiz_id=? AND student_id=? ORDER BY started_at DESC').all(req.quiz.id, req.user.id)
      : db.prepare('SELECT * FROM attempts WHERE quiz_id=? ORDER BY started_at DESC').all(req.quiz.id);
    res.json({ attempts: rows.map((a) => {
      const fin = a.completed_at ? a : (expired(a, req.quiz) ? finalize(a, req.quiz) : a);
      return { ...attemptOut(fin, req.quiz), studentName: db.prepare('SELECT name FROM users WHERE id=?').get(fin.student_id).name };
    }) });
  });

  // ================= Notifications (minimal read side; completed in Phase 4) =================
  r.get('/notifications', (req, res) => {
    res.json({ notifications: db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT 100').all(req.user.id)
      .map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, isRead: !!n.is_read, createdAt: n.created_at })) });
  });
  r.post('/notifications/:id/read', (req, res) => {
    const info = db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
    res.status(info.changes ? 200 : 404).json(info.changes ? { ok: true } : { error: 'Notification not found' });
  });

  return r;
}

module.exports = { assessmentRoutes };
