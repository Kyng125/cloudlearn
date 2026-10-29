const path = require('path');
const { openDb } = require('./db');
const { createApp } = require('./app');

const prod = process.env.NODE_ENV === 'production';
const dbFile = process.env.DB_FILE || path.join(__dirname, '..', 'data', 'cloudlearn.db');
const db = openDb(dbFile);
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const app = createApp(db, {
  uploadDir,
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'),
  cookieSecure: prod,
  trustProxy: prod,
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 10,
});
const port = parseInt(process.env.PORT, 10) || 3000;
const server = app.listen(port, () => console.log(`CloudLearn listening on :${port} (db: ${dbFile})`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.close(() => { db.close(); process.exit(0); }));
