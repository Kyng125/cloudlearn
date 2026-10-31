# Running and testing CloudLearn on Windows

Everything below was written for Windows (PowerShell). Nothing here has been executed on Windows by the assistant: tick each box yourself and tell me what fails.

## Install
- [ ] Node.js 22 LTS from nodejs.org (includes npm). Check: `node -v` shows v22.x
- [ ] Git for Windows (optional)
- [ ] No Visual Studio build tools are needed: `better-sqlite3` ships a prebuilt Windows binary and `bcryptjs` is pure JavaScript. If `npm ci` tries to compile and fails, install "Desktop development with C++" from Visual Studio Build Tools, or switch to Node 22.

## Run (development)
```powershell
cd cloudlearn\backend
npm ci
npm run seed            # demo data; password demo123
cd ..\frontend
npm ci
npm run build           # the backend serves frontend\dist
cd ..\backend
npm start               # http://localhost:3000
```
Sign in as `admin@cloudlearn.com`, `instructor@cloudlearn.com`, or `student@cloudlearn.com` with `demo123`.

## Test
```powershell
cd backend
npm test                # 140+ API tests
```
Browser tests (need Playwright): `npm i -g playwright` then `npx playwright install chromium`; set `$env:NODE_PATH = (npm root -g)` before running `node tests\e2e\crawl.js` (server on port 3100) or `node tests\run-evaluation.js`.
Process-killing commands in the scripts use Node's `process.kill`, which works on Windows. If a port is busy: `netstat -ano | findstr :3000` then `taskkill /PID <pid> /F`.

## Windows checklist
- [ ] `npm ci` succeeds in `backend` and `frontend`
- [ ] `npm run seed` prints "Seeded demo data"
- [ ] `npm test` passes
- [ ] The site loads at http://localhost:3000 and all three demo logins work
- [ ] Upload a PDF as a student submission, download it as the instructor (file names with spaces and accents)
- [ ] Admin > Backup & Recovery: create a backup, restore it, sign in again
- [ ] Antivirus does not quarantine `backend\data\cloudlearn.db` (add an exclusion if it does)
- [ ] Paths containing spaces or OneDrive folders: if the SQLite file is locked, move the project out of OneDrive
