const fs = require('fs');
const path = require('path');
const express = require('express');
const { makeAuth, publicUser, COOKIE, sha256, parseCookies } = require('./auth');
const { newId, now } = require('./db');
const { makeAccess } = require('./access');
const { makeUploads } = require('./uploads');
const { academicRoutes } = require('./academic');
const { assessmentRoutes } = require('./assessment');
const { communicationRoutes } = require('./communication');
const { reportRoutes } = require('./reports');
const { backupRoutes } = require('./backups');

const DEFAULTS = {
  bcryptRounds: 10, sessionDays: 7, cookieSecure: false,
  throttleMax: 5, throttleIpMax: 20, throttleWindowMin: 15,
  uploadDir: path.join(__dirname, '..', 'uploads'), backupDir: path.join(__dirname, '..', 'backups'), maxUploadBytes: 10 * 1024 * 1024, quizGraceSec: 5,
  trustProxy: false, staticDir: path.join(__dirname, '..', '..', 'frontend', 'dist'),
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ['student', 'instructor', 'admin'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function createApp(db, overrides = {}) {
  const config = { ...DEFAULTS, ...overrides };
  const auth = makeAuth(db, config);
  const app = express();
  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  // CSRF defence in depth on top of SameSite=Lax: state-changing requests must be same-origin.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.headers.origin;
    if (origin) {
      let host = '';
      try { host = new URL(origin).host; } catch { /* malformed */ }
      if (host !== req.headers.host) return res.status(403).json({ error: 'Cross-origin request refused' });
    }
    next();
  });
  app.use('/api', auth.attachUser);
  // Every route can record an audit entry attributed to the signed-in user and their address.
  app.use('/api', (req, _res, next) => {
    req.log = (action, detail = '', status = 'success') => auth.logActivity({ userId: req.user ? req.user.id : null, email: req.user ? req.user.email : '', action, detail, ip: req.ip || '', status });
    next();
  });

  const api = express.Router();
  const ip = (req) => req.ip || req.socket.remoteAddress || 'unknown';
  const homeFor = (u) => `${u.role}-dashboard`;
  const validPw = (pw) => typeof pw === 'string' && pw.length >= 6 && pw.length <= 72;

  api.get('/health', (_req, res) => { db.prepare('SELECT 1').get(); res.json({ ok: true }); });

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---------- Auth ----------
  api.post('/auth/register', wrap(async (req, res) => {
    const name = str(req.body.name, 100), email = str(req.body.email, 254).toLowerCase(), password = req.body.password;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!validPw(password)) return res.status(400).json({ error: 'Password must be 6 to 72 characters' });
    const pwHash = await auth.hashAsync(password);
    // Check and insert together with no await between them, so two simultaneous sign-ups cannot both pass the check.
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'An account with this email already exists' });
    const id = newId('u');
    // Self-registration always creates a student; any role in the body is ignored.
    db.prepare('INSERT INTO users (id, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)')
      .run(id, name, email, pwHash, 'student', now());
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    auth.setSession(res, auth.createSession(id));
    auth.logActivity({ userId: id, email, action: 'Registered', ip: ip(req) });
    res.status(201).json({ user: publicUser(user), home: homeFor(user) });
  }));

  api.post('/auth/login', wrap(async (req, res) => {
    const email = str(req.body.email, 254).toLowerCase(), password = req.body.password;
    if (!email || typeof password !== 'string' || !password) return res.status(400).json({ error: 'Email and password are required' });
    const addr = ip(req);
    const t = auth.throttleState(email, addr);
    if (t.locked) {
      res.setHeader('Retry-After', String(t.retryAfterSec));
      return res.status(429).json({ error: 'Too many failed sign-in attempts. Try again later.', retryAfterSeconds: t.retryAfterSec });
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    const ok = (await auth.verifyAsync(password, user ? user.password_hash : auth.DUMMY)) && !!user;
    if (!ok) {
      auth.recordFailure(email, addr);
      auth.logActivity({ userId: user ? user.id : null, email, action: 'Failed login attempt', ip: addr, status: 'failed' });
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.is_active) {
      auth.logActivity({ userId: user.id, email, action: 'Login refused (deactivated account)', ip: addr, status: 'failed' });
      return res.status(403).json({ error: 'This account has been deactivated. Contact an administrator.' });
    }
    auth.clearFailures(email, addr);
    auth.setSession(res, auth.createSession(user.id));
    auth.logActivity({ userId: user.id, email, action: 'Logged in', ip: addr });
    res.json({ user: publicUser(user), home: homeFor(user) });
  }));

  api.post('/auth/logout', (req, res) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
    if (req.user) auth.logActivity({ userId: req.user.id, email: req.user.email, action: 'Logged out', ip: ip(req) });
    auth.clearSession(res);
    res.json({ ok: true });
  });

  api.get('/auth/me', auth.requireAuth, (req, res) => res.json({ user: publicUser(req.user), home: homeFor(req.user) }));

  api.patch('/auth/me', auth.requireAuth, (req, res) => {
    const b = req.body;
    const name = b.name === undefined ? req.user.name : str(b.name, 100);
    if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
    db.prepare('UPDATE users SET name=?, bio=?, phone=?, location=? WHERE id=?').run(
      name,
      b.bio === undefined ? req.user.bio : str(b.bio, 1000),
      b.phone === undefined ? req.user.phone : str(b.phone, 40),
      b.location === undefined ? req.user.location : str(b.location, 120),
      req.user.id);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  });

  api.post('/auth/change-password', auth.requireAuth, wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || !(await auth.verifyAsync(currentPassword, req.user.password_hash))) return res.status(400).json({ error: 'Current password is incorrect' });
    if (!validPw(newPassword)) return res.status(400).json({ error: 'New password must be 6 to 72 characters' });
    db.prepare('UPDATE users SET password_hash=?, must_change_password=0 WHERE id=?').run(await auth.hashAsync(newPassword), req.user.id);
    // Sign out every other session; keep the current one.
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash != ?').run(req.user.id, req.sessionHash);
    auth.logActivity({ userId: req.user.id, email: req.user.email, action: 'Changed password', ip: ip(req) });
    res.json({ ok: true });
  }));

  // ---------- Admin: users ----------
  const admin = express.Router();
  admin.use(auth.requireRole('admin'));
  const activeAdmins = () => db.prepare("SELECT COUNT(*) c FROM users WHERE role='admin' AND is_active=1").get().c;
  const findUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const tempPassword = () => require('crypto').randomBytes(9).toString('base64url');

  // Returns an error string when removing/deactivating/demoting this user would lock the platform out.
  function lockoutError(req, target, action) {
    if (target.id === req.user.id) return `You cannot ${action} your own account`;
    if (target.role === 'admin' && target.is_active && activeAdmins() <= 1) return 'The last active administrator cannot be changed';
    return null;
  }

  admin.get('/users', (_req, res) => {
    res.json({ users: db.prepare('SELECT * FROM users ORDER BY created_at, name').all().map(publicUser) });
  });

  admin.post('/users', (req, res) => {
    const name = str(req.body.name, 100), email = str(req.body.email, 254).toLowerCase(), role = req.body.role;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Role must be student, instructor or admin' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'An account with this email already exists' });
    const id = newId('u'), temp = tempPassword();
    db.prepare('INSERT INTO users (id, name, email, password_hash, role, must_change_password, created_at) VALUES (?,?,?,?,?,1,?)')
      .run(id, name, email, auth.hash(temp), role, now());
    auth.logActivity({ userId: req.user.id, email: req.user.email, action: 'Created user', detail: `${email} (${role})`, ip: ip(req) });
    // The temporary password is shown once, here, and never stored in readable form.
    res.status(201).json({ user: publicUser(findUser(id)), temporaryPassword: temp });
  });

  admin.patch('/users/:id', (req, res) => {
    const target = findUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const { isActive, role, name } = req.body;
    if (isActive !== undefined && typeof isActive !== 'boolean') return res.status(400).json({ error: 'isActive must be true or false' });
    if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (name !== undefined && !str(name, 100)) return res.status(400).json({ error: 'Name cannot be empty' });
    if (isActive === false && target.is_active) {
      const err = lockoutError(req, target, 'deactivate');
      if (err) return res.status(409).json({ error: err });
    }
    if (role !== undefined && role !== target.role) {
      const err = lockoutError(req, target, 'change the role of');
      if (err) return res.status(409).json({ error: err });
    }
    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET name=?, role=?, is_active=? WHERE id=?').run(
        name === undefined ? target.name : str(name, 100),
        role === undefined ? target.role : role,
        isActive === undefined ? target.is_active : (isActive ? 1 : 0),
        target.id);
      // Deactivation or role change takes effect immediately: existing sessions are revoked.
      if (isActive === false || (role !== undefined && role !== target.role)) auth.destroySessionsFor(target.id);
    });
    tx();
    const detail = [isActive !== undefined && `active=${isActive}`, role !== undefined && `role=${role}`].filter(Boolean).join(', ');
    auth.logActivity({ userId: req.user.id, email: req.user.email, action: isActive === false ? 'Deactivated user' : isActive === true ? 'Reactivated user' : 'Updated user', detail: `${target.email}${detail ? ' ' + detail : ''}`, ip: ip(req) });
    res.json({ user: publicUser(findUser(target.id)) });
  });

  admin.delete('/users/:id', (req, res) => {
    const target = findUser(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const err = lockoutError(req, target, 'delete');
    if (err) return res.status(409).json({ error: err });
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
    } catch (e) {
      if (String(e.code).startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'This user owns course or message records. Deactivate the account instead.' });
      throw e;
    }
    auth.logActivity({ userId: req.user.id, email: req.user.email, action: 'Deleted user', detail: target.email, ip: ip(req) });
    res.json({ ok: true });
  });

  admin.get('/activity-logs', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500), offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const where = [], args = [];
    if (['success', 'failed'].includes(req.query.status)) { where.push('status = ?'); args.push(req.query.status); }
    if (typeof req.query.q === 'string' && req.query.q.trim()) { where.push('(action LIKE ? OR actor_email LIKE ? OR detail LIKE ?)'); const q = `%${req.query.q.trim().slice(0, 100)}%`; args.push(q, q, q); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.prepare(`SELECT COUNT(*) c FROM activity_log ${w}`).get(...args).c;
    const rows = db.prepare(`SELECT id, at, actor_email AS user, action, detail, ip, status FROM activity_log ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
    res.json({ logs: rows, total });
  });

  admin.use('/backups', backupRoutes({ db, auth, config }));
  api.use('/admin', admin);
  const uploads = makeUploads(config);
  const access = makeAccess(db);
  api.use(academicRoutes({ db, auth, access, uploads }));
  api.use(assessmentRoutes({ db, auth, access, uploads, config }));
  api.use(communicationRoutes({ db, auth, access }));
  api.use(reportRoutes({ db, auth }));
  api.use((_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use('/api', api);

  // Serve the built front end (single-service deployment) when present.
  if (fs.existsSync(path.join(config.staticDir, 'index.html'))) {
    app.use(express.static(config.staticDir));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(config.staticDir, 'index.html')));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File is too large' });
    if (err.name === 'MulterError') return res.status(400).json({ error: 'Invalid upload' });
    if (err.status === 400) return res.status(400).json({ error: err.message });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
