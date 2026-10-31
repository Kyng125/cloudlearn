// First-boot setup for an empty database (always the case on Render's free plan after a restart or sleep).
const bcrypt = require('bcryptjs');
const { seed } = require('./seed');
const { newId, now } = require('./db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns a short description of what was done. Throws on unsafe or missing configuration.
function bootstrap(db, env = process.env, { rounds = 10 } = {}) {
  if (db.prepare('SELECT COUNT(*) c FROM users').get().c > 0) return 'existing data kept';
  const prod = env.NODE_ENV === 'production';
  const adminEmail = String(env.ADMIN_EMAIL || 'admin@cloudlearn.com').trim().toLowerCase();
  const adminPassword = env.ADMIN_PASSWORD || '';
  const demo = env.BOOTSTRAP_DEMO === '1';
  if (!EMAIL_RE.test(adminEmail)) throw new Error('ADMIN_EMAIL is not a valid email address');
  if (prod && adminPassword.length < 10) throw new Error('ADMIN_PASSWORD (at least 10 characters) must be set to start CloudLearn in production with an empty database');
  if (adminPassword && (adminPassword.length < 6 || adminPassword.length > 72)) throw new Error('ADMIN_PASSWORD must be 6 to 72 characters');
  if (demo) {
    seed(db, { rounds, adminEmail, adminPassword: adminPassword || null, password: env.DEMO_PASSWORD || 'demo123' });
    return `demo data created; admin ${adminEmail}`;
  }
  if (!adminPassword) return 'empty database (no ADMIN_PASSWORD set; run the seed script or set it)';
  db.prepare('INSERT INTO users (id,name,email,password_hash,role,bio,location,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(newId('u'), 'Platform Admin', adminEmail, bcrypt.hashSync(adminPassword, rounds), 'admin', '', '', now());
  return `admin ${adminEmail} created`;
}

module.exports = { bootstrap };
