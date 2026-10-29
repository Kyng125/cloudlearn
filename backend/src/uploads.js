const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const ALLOWED = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'md', 'csv', 'zip', 'png', 'jpg', 'jpeg', 'gif',
  'py', 'js', 'java', 'c', 'cpp', 'html', 'css', 'sql', 'json']);

const cleanName = (raw) => {
  // multer decodes names as latin1; restore UTF-8, strip any path and control characters.
  let n = Buffer.from(String(raw || 'file'), 'latin1').toString('utf8');
  n = n.split(/[\\/]/).pop().replace(/[\u0000-\u001f<>:"|?*]/g, '').trim().slice(0, 150);
  return n || 'file';
};

function makeUploads(config) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: config.uploadDir,
      filename: (_req, _file, cb) => cb(null, crypto.randomUUID()), // never derived from user input
    }),
    limits: { fileSize: config.maxUploadBytes, files: 1, fields: 10 },
    fileFilter: (_req, file, cb) => {
      const ext = cleanName(file.originalname).split('.').pop().toLowerCase();
      if (!ALLOWED.has(ext)) return cb(Object.assign(new Error(`File type .${ext} is not allowed`), { status: 400 }));
      cb(null, true);
    },
  });
  const pathFor = (stored) => {
    const p = path.resolve(config.uploadDir, stored);
    return p.startsWith(path.resolve(config.uploadDir) + path.sep) ? p : null; // no path escape
  };
  const remove = (stored) => { const p = pathFor(stored); if (p) fs.rm(p, { force: true }, () => {}); };
  return { upload, pathFor, remove, cleanName };
}

module.exports = { makeUploads };
