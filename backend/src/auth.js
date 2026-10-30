const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { now, newId } = require('./db');

const COOKIE = 'cl_sid';
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function publicUser(u) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, bio: u.bio,
    phone: u.phone, location: u.location, joinedAt: u.created_at.slice(0, 10),
    isActive: !!u.is_active, mustChangePassword: !!u.must_change_password,
  };
}

function makeAuth(db, config) {
  // Cost factor is configurable so tests stay fast; production uses 10+.
  const hash = (pw) => bcrypt.hashSync(pw, config.bcryptRounds);
  // Async variants yield to the event loop between rounds, so a burst of sign-ins cannot freeze every other request.
  const hashAsync = (pw) => bcrypt.hash(pw, config.bcryptRounds);
  const verifyAsync = (pw, h) => bcrypt.compare(pw, h);
  const DUMMY = hash('not-a-real-password'); // equalises timing for unknown emails

  function createSession(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const created = new Date();
    const expires = new Date(created.getTime() + config.sessionDays * 86400000);
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)')
      .run(sha256(token), userId, created.toISOString(), expires.toISOString());
    return token;
  }
  const cookieHeader = (token, maxAgeSec) =>
    `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${config.cookieSecure ? '; Secure' : ''}`;
  const setSession = (res, token) => res.setHeader('Set-Cookie', cookieHeader(token, config.sessionDays * 86400));
  const clearSession = (res) => res.setHeader('Set-Cookie', cookieHeader('', 0));
  const destroySessionsFor = (userId) => db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

  // Populates req.user when the session cookie is valid, the session unexpired and the account active.
  function attachUser(req, _res, next) {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    req.sessionHash = null;
    req.user = null;
    if (token) {
      const row = db.prepare(`SELECT u.*, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1`).get(sha256(token), now());
      if (row) { req.user = row; req.sessionHash = row.token_hash; }
    }
    next();
  }
  const requireAuth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: 'Authentication required' });
  const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do this' });
    next();
  };

  // Persistent throttle: failures live in the database so a restart does not reset the counter.
  function throttleState(email, ip) {
    const since = new Date(Date.now() - config.throttleWindowMin * 60000).toISOString();
    const pair = db.prepare('SELECT COUNT(*) c, MIN(at) first FROM login_attempts WHERE email=? AND ip=? AND at>?').get(email, ip, since);
    const byIp = db.prepare('SELECT COUNT(*) c, MIN(at) first FROM login_attempts WHERE ip=? AND at>?').get(ip, since);
    const locked = pair.c >= config.throttleMax || byIp.c >= config.throttleIpMax;
    const first = pair.c >= config.throttleMax ? pair.first : byIp.first;
    const retryAfterSec = locked ? Math.max(1, Math.ceil((new Date(first).getTime() + config.throttleWindowMin * 60000 - Date.now()) / 1000)) : 0;
    return { locked, retryAfterSec };
  }
  const recordFailure = (email, ip) => db.prepare('INSERT INTO login_attempts (email, ip, at) VALUES (?,?,?)').run(email, ip, now());
  const clearFailures = (email, ip) => db.prepare('DELETE FROM login_attempts WHERE email=? AND ip=?').run(email, ip);

  function logActivity({ userId = null, email = '', action, detail = '', ip = '', status = 'success' }) {
    db.prepare('INSERT INTO activity_log (at, user_id, actor_email, action, detail, ip, status) VALUES (?,?,?,?,?,?,?)')
      .run(now(), userId, email, action, detail, ip, status);
  }

  return {
    hash, hashAsync, verifyAsync, DUMMY, verify: (pw, h) => bcrypt.compareSync(pw, h),
    createSession, setSession, clearSession, destroySessionsFor,
    attachUser, requireAuth, requireRole,
    throttleState, recordFailure, clearFailures, logActivity, newId,
  };
}

module.exports = { makeAuth, publicUser, COOKIE, sha256, parseCookies };
