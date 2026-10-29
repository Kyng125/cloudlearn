// Demo seed: placeholder HND Computer Science content (assumption A6) with dates relative to "now".
const path = require('path');
const bcrypt = require('bcryptjs');
const { openDb } = require('./db');

const DAY = 86400000;
const TABLES = ['activity_log', 'notifications', 'messages', 'posts', 'threads', 'attempts', 'questions', 'quizzes', 'grades',
  'submissions', 'assignments', 'lesson_progress', 'enrollments', 'materials', 'lessons', 'modules', 'courses',
  'login_attempts', 'sessions', 'users'];

function seed(db, { rounds = 10, password = 'demo123' } = {}) {
  const t = Date.now();
  const at = (days) => new Date(t + days * DAY).toISOString();
  const hash = bcrypt.hashSync(password, rounds);
  const run = db.transaction(() => {
    const user = db.prepare('INSERT INTO users (id,name,email,password_hash,role,bio,location,created_at) VALUES (?,?,?,?,?,?,?,?)');
    [
      ['u_admin', 'Platform Admin', 'admin@cloudlearn.com', 'admin', 'Platform administrator.', 'Lagos, Nigeria', -120],
      ['u_ins1', 'Dr. Sarah Chen', 'instructor@cloudlearn.com', 'instructor', 'Lecturer in programming and databases.', 'Lagos, Nigeria', -110],
      ['u_ins2', 'Mrs. Folake Adeyemi', 'instructor2@cloudlearn.com', 'instructor', 'Lecturer in web technologies and networks.', 'Lagos, Nigeria', -100],
      ['u_stu1', 'Alex Johnson', 'student@cloudlearn.com', 'student', 'HND Computer Science student.', 'Lagos, Nigeria', -60],
      ['u_stu2', 'Chidi Okafor', 'chidi@example.com', 'student', '', 'Lagos, Nigeria', -55],
      ['u_stu3', 'Amina Bello', 'amina@example.com', 'student', '', 'Lagos, Nigeria', -50],
      ['u_stu4', 'Emeka Nwosu', 'emeka@example.com', 'student', '', 'Lagos, Nigeria', -45],
      ['u_stu5', 'Ngozi Eze', 'ngozi@example.com', 'student', '', 'Lagos, Nigeria', -40],
    ].forEach(([id, name, email, role, bio, loc, d]) => user.run(id, name, email, hash, role, bio, loc, at(d)));

    const course = db.prepare('INSERT INTO courses (id,title,description,instructor_id,category,level,is_published,created_at) VALUES (?,?,?,?,?,?,?,?)');
    const module_ = db.prepare('INSERT INTO modules (id,course_id,title,position) VALUES (?,?,?,?)');
    const lesson = db.prepare('INSERT INTO lessons (id,module_id,title,type,content,duration_minutes,position) VALUES (?,?,?,?,?,?,?)');
    const courses = [
      ['c1', 'Programming Fundamentals with Python', 'Variables, control flow, functions and data structures.', 'u_ins1', 'Programming', 'beginner', 1, [
        ['Getting Started', ['Installing Python and your first program', 'Variables and data types']],
        ['Control Flow and Functions', ['Conditionals and loops', 'Writing functions']]]],
      ['c2', 'Database Systems and SQL', 'Relational modelling, normalisation and SQL queries.', 'u_ins1', 'Databases', 'intermediate', 1, [
        ['Relational Basics', ['Entities, keys and relationships', 'Normalisation']],
        ['Querying', ['SELECT, WHERE and JOIN', 'Aggregation and grouping']]]],
      ['c3', 'Web Development Essentials', 'HTML, CSS and JavaScript for building responsive pages.', 'u_ins2', 'Web', 'beginner', 1, [
        ['Markup and Style', ['HTML structure', 'CSS layout']],
        ['Interactivity', ['JavaScript basics', 'Working with the DOM']]]],
      ['c4', 'Computer Networks and Cloud Concepts', 'Network models, protocols and cloud service models.', 'u_ins2', 'Networking', 'intermediate', 1, [
        ['Networking Foundations', ['OSI and TCP/IP models', 'IP addressing']],
        ['Cloud Computing', ['IaaS, PaaS and SaaS', 'Deployment models']]]],
      ['c5', 'Operating Systems Concepts', 'Processes, memory management and file systems (draft).', 'u_ins2', 'Systems', 'intermediate', 0, [
        ['Processes', ['Process lifecycle', 'Scheduling']]]],
    ];
    courses.forEach(([id, title, desc, ins, cat, lvl, pub, mods], ci) => {
      course.run(id, title, desc, ins, cat, lvl, pub, at(-90 + ci));
      mods.forEach(([mt, ls], mi) => {
        const mid = `${id}_m${mi + 1}`;
        module_.run(mid, id, mt, mi);
        ls.forEach((lt, li) => lesson.run(`${mid}_l${li + 1}`, mid, lt, li % 2 ? 'text' : 'video', `Notes for: ${lt}`, 10 + li * 5, li));
      });
    });

    const enrol = db.prepare('INSERT INTO enrollments (id,student_id,course_id,enrolled_at) VALUES (?,?,?,?)');
    const enrolments = { u_stu1: ['c1', 'c2', 'c3', 'c4'], u_stu2: ['c1', 'c2'], u_stu3: ['c1', 'c3'], u_stu4: ['c3', 'c4'], u_stu5: ['c2'] };
    Object.entries(enrolments).forEach(([sid, cs]) => cs.forEach((cid, i) => enrol.run(`e_${sid}_${cid}`, sid, cid, at(-30 + i))));

    const prog = db.prepare('INSERT INTO lesson_progress (student_id,lesson_id,completed_at) VALUES (?,?,?)');
    ['c1_m1_l1', 'c1_m1_l2', 'c1_m2_l1', 'c2_m1_l1'].forEach((l, i) => prog.run('u_stu1', l, at(-20 + i)));
    prog.run('u_stu2', 'c1_m1_l1', at(-18));

    const asg = db.prepare('INSERT INTO assignments (id,course_id,title,description,due_at,max_points,created_at) VALUES (?,?,?,?,?,?,?)');
    asg.run('a1', 'c1', 'Python Functions Project', 'Write a program that uses functions to process a list of scores.', at(-7), 100, at(-21));
    asg.run('a2', 'c1', 'Data Structures Exercise', 'Implement a stack and a queue using lists.', at(5), 50, at(-3));
    asg.run('a3', 'c2', 'ER Diagram and Schema', 'Model a library system and write its CREATE TABLE statements.', at(9), 100, at(-2));
    asg.run('a4', 'c3', 'Personal Portfolio Page', 'Build a responsive one-page portfolio with HTML and CSS.', at(3), 100, at(-5));

    const sub = db.prepare('INSERT INTO submissions (id,assignment_id,student_id,file_name,stored_name,submitted_at,is_late) VALUES (?,?,?,?,?,?,?)');
    sub.run('s1', 'a1', 'u_stu1', 'functions_project.py', 'seed-placeholder', at(-8), 0);
    sub.run('s2', 'a1', 'u_stu2', 'functions_chidi.py', 'seed-placeholder', at(-6), 1);
    db.prepare('INSERT INTO grades (submission_id,score,feedback,graded_by,graded_at) VALUES (?,?,?,?,?)')
      .run('s1', 88, 'Good use of functions. Add input validation next time.', 'u_ins1', at(-5));

    const quiz = db.prepare('INSERT INTO quizzes (id,course_id,title,duration_minutes,passing_score,is_exam,is_published,created_at) VALUES (?,?,?,?,?,?,?,?)');
    const q = db.prepare('INSERT INTO questions (id,quiz_id,text,options_json,correct_index,points,explanation,position) VALUES (?,?,?,?,?,?,?,?)');
    quiz.run('qz1', 'c1', 'Python Basics Quiz', 10, 60, 0, 1, at(-25));
    [
      ['What is the output of print(type(42))?', ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'number'>"], 0, 'Integers have type int.'],
      ['Which keyword defines a function in Python?', ['func', 'def', 'function', 'lambda only'], 1, 'Functions are defined with def.'],
      ['Which structure is ordered and mutable?', ['tuple', 'set', 'list', 'frozenset'], 2, 'Lists are ordered and mutable.'],
      ['What does len("cloud") return?', ['4', '5', '6', 'Error'], 1, 'The string has 5 characters.'],
      ['Which loop runs while a condition is true?', ['for', 'while', 'foreach', 'repeat'], 1, 'while repeats while its condition holds.'],
    ].forEach(([text, opts, c, ex], i) => q.run(`qz1_q${i + 1}`, 'qz1', text, JSON.stringify(opts), c, 1, ex, i));
    quiz.run('qz2', 'c2', 'SQL Fundamentals Quiz', 10, 60, 0, 1, at(-12));
    [
      ['Which clause filters rows?', ['ORDER BY', 'WHERE', 'GROUP BY', 'LIMIT'], 1, 'WHERE filters rows before grouping.'],
      ['Which key uniquely identifies a row?', ['Foreign key', 'Primary key', 'Index', 'View'], 1, 'The primary key is unique per row.'],
      ['Which JOIN returns only matching rows?', ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'CROSS JOIN'], 2, 'INNER JOIN keeps matches only.'],
      ['Which function counts rows?', ['SUM', 'COUNT', 'AVG', 'MAX'], 1, 'COUNT returns the number of rows.'],
      ['Normalisation mainly reduces…', ['Redundancy', 'Security', 'Latency', 'Storage speed'], 0, 'It removes redundant data.'],
    ].forEach(([text, opts, c, ex], i) => q.run(`qz2_q${i + 1}`, 'qz2', text, JSON.stringify(opts), c, 1, ex, i));
    db.prepare('INSERT INTO attempts (id,quiz_id,student_id,started_at,completed_at,answers_json,score,total_points,passed) VALUES (?,?,?,?,?,?,?,?,?)')
      .run('at1', 'qz1', 'u_stu2', at(-10), at(-10), JSON.stringify([0, 1, 2, 1, 0]), 4, 5, 1);

    db.prepare('INSERT INTO threads (id,course_id,author_id,title,created_at) VALUES (?,?,?,?,?)').run('th1', 'c1', 'u_stu1', 'Difference between a list and a tuple?', at(-9));
    const post = db.prepare('INSERT INTO posts (id,thread_id,author_id,body,created_at) VALUES (?,?,?,?,?)');
    post.run('p1', 'th1', 'u_stu1', 'When should I prefer a tuple over a list?', at(-9));
    post.run('p2', 'th1', 'u_ins1', 'Use a tuple for fixed collections that should not change; a list when you need to modify items.', at(-8));
    db.prepare('INSERT INTO messages (id,from_id,to_id,subject,body,created_at) VALUES (?,?,?,?,?,?)')
      .run('m1', 'u_ins1', 'u_stu1', 'Re: Question about Module 3', 'Happy to go through it in the next session.', at(-4));
    const note = db.prepare('INSERT INTO notifications (id,user_id,type,title,body,created_at) VALUES (?,?,?,?,?,?)');
    note.run('n1', 'u_stu1', 'grade', 'Assignment graded', 'Your "Python Functions Project" scored 88/100.', at(-5));
    note.run('n2', 'u_stu1', 'assignment', 'New assignment', '"ER Diagram and Schema" was posted in Database Systems and SQL.', at(-2));
    note.run('n3', 'u_ins1', 'submission', 'New submission', 'Chidi Okafor submitted "Python Functions Project" (late).', at(-6));
  });
  run();
}

function reset(db) { db.pragma('foreign_keys = OFF'); TABLES.forEach((tb) => db.prepare(`DELETE FROM ${tb}`).run()); db.pragma('foreign_keys = ON'); }

if (require.main === module) {
  const prod = process.env.NODE_ENV === 'production';
  const args = process.argv.slice(2);
  if (prod && !args.includes('--force-production')) { console.error('Refusing to seed demo data in production without --force-production.'); process.exit(1); }
  const db = openDb(process.env.DB_FILE || path.join(__dirname, '..', 'data', 'cloudlearn.db'));
  const existing = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (existing && !args.includes('--reset')) { console.error(`Database already has ${existing} users. Re-run with --reset to wipe and reseed.`); process.exit(1); }
  if (existing) reset(db);
  seed(db, { rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10 });
  console.log('Seeded demo data. Demo logins: student@/instructor@/admin@cloudlearn.com, password demo123');
}

module.exports = { seed, reset };
