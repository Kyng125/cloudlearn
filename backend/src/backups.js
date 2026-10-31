const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const multer = require('multer');
const { zipSync, unzipSync } = require('fflate');

const NAME_RE = /^backup-\d{8}-\d{6}-[a-z0-9]+$/;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const MAX_UNPACKED = 600 * 1024 * 1024;           // refuse zip bombs: total unpacked size
const UPLOAD_ENTRY_RE = /^uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/; // flat, generated file names only

function backupRoutes({ db, auth, config }) {
  const r = express.Router();
  r.use(auth.requireRole('admin'));
  let busy = false; // one backup/restore at a time
  const ip = (req) => req.ip || '';

  const dirOf = (name) => {
    if (!NAME_RE.test(name)) return null;
    const d = path.resolve(config.backupDir, name);
    return d.startsWith(path.resolve(config.backupDir) + path.sep) && fs.existsSync(path.join(d, 'cloudlearn.db')) ? d : null;
  };
  const sizeOf = (d) => { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); n += e.isDirectory() ? sizeOf(p) : fs.statSync(p).size; } return n; };
  const info = (name) => {
    const d = dirOf(name); if (!d) return null;
    const m = JSON.parse(fs.readFileSync(path.join(d, 'manifest.json'), 'utf8'));
    return { name, createdAt: m.createdAt, kind: m.kind, sizeBytes: sizeOf(d), users: m.counts.users, courses: m.counts.courses };
  };
  const list = () => (fs.existsSync(config.backupDir) ? fs.readdirSync(config.backupDir).filter((n) => NAME_RE.test(n)).map(info).filter(Boolean) : [])
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const tables = (d) => d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((t) => t.name);
  const counts = (d) => Object.fromEntries(tables(d).map((t) => [t, d.prepare(`SELECT COUNT(*) c FROM "${t}"`).get().c]));

  async function createBackup(kind) {
    fs.mkdirSync(config.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-');
    const name = `backup-${stamp}-${kind === 'pre-restore' ? 'pre' : 'm'}${crypto.randomBytes(3).toString('hex')}`;
    const dir = path.join(config.backupDir, name);
    fs.mkdirSync(dir);
    try {
      await db.backup(path.join(dir, 'cloudlearn.db'));            // consistent snapshot via SQLite's online backup API
      if (fs.existsSync(config.uploadDir)) fs.cpSync(config.uploadDir, path.join(dir, 'uploads'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), kind, counts: counts(db) }));
    } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e; } // a failed backup leaves nothing half-written
    return info(name);
  }

  r.get('/', (_req, res) => res.json({ backups: list() }));

  r.post('/', wrap(async (req, res) => {
    if (busy) return res.status(409).json({ error: 'A backup or restore is already running' });
    busy = true;
    try { const b = await createBackup('manual'); req.log('Created backup', b.name); res.status(201).json({ backup: b }); } finally { busy = false; }
  }));

  // ---- Download a backup as one .zip (database + manifest + uploaded files) so it can be kept off the server ----
  r.get('/:name/download', wrap(async (req, res) => {
    const d = dirOf(req.params.name);
    if (!d) return res.status(404).json({ error: 'Backup not found' });
    if (sizeOf(d) > (config.maxBackupDownloadBytes || 200 * 1024 * 1024)) return res.status(413).json({ error: 'This backup is too large to download from here' });
    const entries = {};
    entries['cloudlearn.db'] = fs.readFileSync(path.join(d, 'cloudlearn.db'));
    entries['manifest.json'] = fs.readFileSync(path.join(d, 'manifest.json'));
    const up = path.join(d, 'uploads');
    if (fs.existsSync(up)) for (const f of fs.readdirSync(up, { withFileTypes: true })) if (f.isFile() && UPLOAD_ENTRY_RE.test(`uploads/${f.name}`)) entries[`uploads/${f.name}`] = fs.readFileSync(path.join(up, f.name));
    const zip = zipSync(entries, { level: 1 });
    req.log('Downloaded backup', req.params.name);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}.zip"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(zip));
  }));

  // ---- Upload a previously downloaded backup. It is validated and stored as a new backup; restoring is a separate, confirmed step ----
  const zipUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.maxBackupUploadBytes || 100 * 1024 * 1024, files: 1, fields: 5 } });
  const bad = (msg) => Object.assign(new Error(msg), { status: 400 });
  r.post('/upload', (req, res, next) => { if (busy) return res.status(409).json({ error: 'A backup or restore is already running' }); next(); }, zipUpload.single('file'), wrap(async (req, res) => {
    if (!req.file) throw bad('Choose a backup .zip file to upload');
    if (req.file.size === 0) throw bad('The file is empty');
    let files;
    try {
      // Pass 1 only reads the zip's directory: check names and the total unpacked size BEFORE inflating anything.
      let total = 0;
      const allowed = (f) => f.name === 'cloudlearn.db' || f.name === 'manifest.json' || UPLOAD_ENTRY_RE.test(f.name);
      unzipSync(new Uint8Array(req.file.buffer), { filter: (f) => {
        if (f.name.endsWith('/')) return false; // directory markers
        if (!allowed(f)) throw bad(`Unexpected file in backup: ${String(f.name).slice(0, 60)}`);
        total += f.originalSize;
        if (total > MAX_UNPACKED) throw bad('The backup is too large when unpacked');
        return false;
      } });
      files = unzipSync(new Uint8Array(req.file.buffer), { filter: (f) => allowed(f) });
    } catch (e) { if (e.status === 400) throw e; throw bad('This is not a valid backup zip'); }
    if (!files['cloudlearn.db'] || !files['manifest.json']) throw bad('This zip is not a CloudLearn backup (database or manifest missing)');
    let manifest;
    try { manifest = JSON.parse(Buffer.from(files['manifest.json']).toString('utf8')); } catch { throw bad('The backup manifest is unreadable'); }
    if (!manifest || typeof manifest.createdAt !== 'string' || !manifest.counts || typeof manifest.counts.users !== 'number') throw bad('The backup manifest is not in the expected format');

    busy = true;
    fs.mkdirSync(config.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-');
    const name = `backup-${stamp}-u${crypto.randomBytes(3).toString('hex')}`;
    const dir = path.join(config.backupDir, name);
    try {
      fs.mkdirSync(path.join(dir, 'uploads'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'cloudlearn.db'), files['cloudlearn.db']);
      // The database must be a healthy SQLite file with this app's tables before it is ever offered for restore.
      let bk;
      try {
        bk = new Database(path.join(dir, 'cloudlearn.db'), { readonly: true, fileMustExist: true });
        if (bk.pragma('integrity_check', { simple: true }) !== 'ok') throw bad('The backup database is damaged');
        const have = new Set(tables(bk)); const need = tables(db);
        const missing = need.filter((t) => !have.has(t));
        if (missing.length) throw bad(`The backup database is missing tables: ${missing.slice(0, 3).join(', ')}`);
      } catch (e) { if (e.status === 400) throw e; throw bad('The backup database cannot be read'); } finally { if (bk) bk.close(); }
      for (const [n, buf] of Object.entries(files)) if (n.startsWith('uploads/')) fs.writeFileSync(path.join(dir, n), buf);
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ createdAt: manifest.createdAt, kind: 'uploaded', counts: manifest.counts }));
    } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e; } finally { busy = false; }
    req.log('Uploaded backup', `${name} (from ${String(req.file.originalname).slice(0, 80)})`);
    res.status(201).json({ backup: info(name) });
  }));

  r.delete('/:name', (req, res) => {
    const d = dirOf(req.params.name);
    if (!d) return res.status(404).json({ error: 'Backup not found' });
    fs.rmSync(d, { recursive: true, force: true });
    req.log('Deleted backup', req.params.name);
    res.json({ ok: true });
  });

  r.post('/:name/restore', wrap(async (req, res) => {
    const d = dirOf(req.params.name);
    if (!d) return res.status(404).json({ error: 'Backup not found' });
    if (req.body.confirm !== true) return res.status(400).json({ error: 'Restoring replaces ALL current data. Send {"confirm": true} to proceed.' });
    if (busy) return res.status(409).json({ error: 'A backup or restore is already running' });
    busy = true;
    try {
      // 1. Validate the backup before touching live data.
      const bk = new Database(path.join(d, 'cloudlearn.db'), { readonly: true, fileMustExist: true });
      let live; try {
        if (bk.pragma('integrity_check', { simple: true }) !== 'ok') return res.status(400).json({ error: 'The backup file is damaged and was not restored' });
        live = tables(db);
        const same = JSON.stringify(tables(bk)) === JSON.stringify(live) &&
          live.every((t) => JSON.stringify(bk.pragma(`table_info("${t}")`).map((c) => c.name)) === JSON.stringify(db.pragma(`table_info("${t}")`).map((c) => c.name)));
        if (!same) return res.status(400).json({ error: 'The backup does not match the current database layout and was not restored' });
      } finally { bk.close(); }
      // 2. Safety net: snapshot the current state first so a mistaken restore can be undone.
      const safety = await createBackup('pre-restore');
      // 3. Replace every table inside ONE transaction: all-or-nothing.
      const file = path.join(d, 'cloudlearn.db').replace(/'/g, "''");
      db.pragma('foreign_keys = OFF');
      db.exec(`ATTACH DATABASE '${file}' AS bk`);
      try {
        db.transaction(() => {
          for (const t of live) {
            const cols = db.pragma(`table_info("${t}")`).map((c) => `"${c.name}"`).join(',');
            db.exec(`DELETE FROM main."${t}"; INSERT INTO main."${t}" (${cols}) SELECT ${cols} FROM bk."${t}";`);
          }
          if (db.pragma('foreign_key_check').length) throw Object.assign(new Error('The backup breaks referential integrity and was not restored'), { status: 400 });
          db.exec('DELETE FROM main.sessions'); // restored data must never resurrect old logins (e.g. of since-deactivated users)
        })();
      } finally { db.exec('DETACH DATABASE bk'); db.pragma('foreign_keys = ON'); }
      // 4. Put the matching uploaded files back.
      fs.rmSync(config.uploadDir, { recursive: true, force: true });
      fs.mkdirSync(config.uploadDir, { recursive: true });
      if (fs.existsSync(path.join(d, 'uploads'))) fs.cpSync(path.join(d, 'uploads'), config.uploadDir, { recursive: true });
      req.log('Restored backup', `${req.params.name} (previous state saved as ${safety.name})`);
      res.json({ ok: true, restored: req.params.name, safetyBackup: safety.name, note: 'All sessions were revoked by the restore. Sign in again.' });
    } finally { busy = false; }
  }));

  return r;
}

module.exports = { backupRoutes };
