# Deploying CloudLearn on Render (free plan)

## What you are deploying
One Node service: Express serves the API under `/api` and the built React app for everything else. Data is a single SQLite file.

## READ THIS FIRST: the free plan forgets everything
Render's free web services have an ephemeral filesystem. The database, uploaded files and backups are **lost** whenever the service restarts, redeploys, or spins down after about 15 minutes without traffic ([Render docs](https://render.com/docs/free)). Waking up takes about a minute.

What CloudLearn does about it:
- On every cold start it creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (and demo data if `BOOTSTRAP_DEMO=1`), so the site is never an unusable empty shell.
- The app shows a "demo hosting" notice to signed-in users.
- Backups made in the admin screen live on the same wiped disk, so they do not protect you on this plan **unless you download them**: Admin > Backup & Recovery > Download saves a .zip (database, uploaded files, manifest) to your computer.

For the seminar demo:
1. Set `BOOTSTRAP_DEMO=1` so the site starts with courses, a quiz, assignments and demo accounts, and sign in as the admin with your own password.
2. Open the site a few minutes before presenting so it is awake (a cold start takes about a minute and the first page shows Render's loading screen).
3. Anything created during the demo is gone after the next sleep. To keep it: create a backup and Download it before you finish. After a reset, sign in with the ADMIN_EMAIL account, choose Upload backup, then Restore: the original accounts, courses, grades and files come back and everyone is signed out (sign in with the accounts from the backup, which may include the original admin password).
4. 750 free instance hours per month are shared by the workspace; a service that is awake all month uses about 744.

If you need data to survive: a paid web service with a persistent disk mounted at `/var/data` (set `DB_FILE=/var/data/cloudlearn.db`, `UPLOAD_DIR=/var/data/uploads`, `BACKUP_DIR=/var/data/backups`, remove `EPHEMERAL_STORAGE`). No code change is needed. Render's free Postgres expires after 30 days and would need the SQL ported, so it is not recommended here.

## Keeping and moving data (backup download / upload)
- Download: any backup row has a Download link (admin only). The zip contains `cloudlearn.db`, `manifest.json` and `uploads/`. It holds every user's password hash and all coursework, so store it privately.
- Upload: only zips made by CloudLearn are accepted. The server checks file names, total unpacked size (zip-bomb guard), that the database is healthy and has this app's tables, and a size limit (100 MB, `maxBackupUploadBytes`). An uploaded backup appears in the list as type "uploaded" and changes nothing until you press Restore.
- Large backups: downloads above 200 MB are refused (the zip is built in memory on a small free instance).
- Restoring an older backup into a newer version of the app works as long as the tables match; after an app upgrade that changes the database, restore only backups taken since.

## Steps
1. Push the repository to GitHub (`.env` and databases are git-ignored; never commit passwords).
2. Render dashboard > New > Blueprint > pick the repository. Render reads `render.yaml`.
3. When prompted, enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ characters). Leave `DEMO_PASSWORD` empty to default to `demo123` for the demo lecturers and students, or set your own (recommended on a public URL).
4. Deploy. Watch the log for `Bootstrap: ...` and `CloudLearn listening`.
5. Open the `https://<name>.onrender.com` address and run the smoke test:
   ```
   node tests/smoke-live.js https://<name>.onrender.com admin@your-email 'your-admin-password'
   ```
   It checks HTTPS, headers, sign-in, role guards and that no demo password opens the admin. It does not write any data.

## Environment variables
| Variable | Purpose |
|---|---|
| `NODE_ENV=production` | Secure cookies, HSTS, trust of Render's proxy. The server refuses to start with an empty database unless `ADMIN_PASSWORD` is 10+ characters. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin created on first boot. The demo password never applies to the admin. |
| `BOOTSTRAP_DEMO`, `DEMO_PASSWORD` | Optional demo data on first boot. |
| `EPHEMERAL_STORAGE=1` | Shows the data-reset notice. Remove when you use a persistent disk. |
| `DB_FILE`, `UPLOAD_DIR`, `BACKUP_DIR` | Locations of data. |
| `BCRYPT_ROUNDS` | Leave unset (10). Decision D43: sign-in bursts of about 100 students take up to ~8 s; stagger class quiz starts. |

## Troubleshooting
- Log says `Cannot start: ADMIN_PASSWORD ...`: set it in Render > Environment.
- First load takes ~1 minute: the free service was asleep.
- Everything reset: the service restarted or slept (see above).
- `better-sqlite3` build error: keep `NODE_VERSION=22`.
- `vite: not found` during build: Render sets `NODE_ENV=production` for the build, so `npm ci` skips devDependencies. The build command must be `cd frontend && npm ci --include=dev && npm run build && cd ../backend && npm ci --omit=dev` (already in render.yaml). If you created the service before this fix, edit Build Command in Render > Settings.
