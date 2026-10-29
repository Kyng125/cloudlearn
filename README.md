# CloudLearn

Cloud-based e-learning platform for hybrid learning. Case study for the Department of Computer Science, Yaba College of Technology (HND seminar).

## Layout
- `frontend/`  React 19 + Vite + Tailwind 4 + Recharts (from Figma Make, repaired in Phase 1)
- `backend/`   Node + Express + SQLite: auth, roles, admin user management (Phase 2)
- `tests/e2e/` Playwright regression scripts
- `BUILD-PLAN.md` phased plan; `DECISIONS.md`, `ASSUMPTIONS.md`, `TODO.md`, `REPORT-CHANGES.md` project state

## Run (current state: front end only, localStorage)
```
cd frontend
npm install
npm run dev
```
Demo logins (password `demo123`): student@ / instructor@ / admin@cloudlearn.com

## Status
Phases 1 to 4 complete (front end repaired, backend auth/roles, academic API, communication/reports/backup). The front end still uses localStorage; it is connected to the API in Phase 5.

## Backend
```
cd backend
npm install
npm run seed      # demo data (dev only)
npm start         # http://localhost:3000, serves frontend/dist if built
npm test          # node:test suite
```
Uploaded files go to `backend/uploads/` (git-ignored). Env: `PORT`, `DB_FILE`, `UPLOAD_DIR` and `BACKUP_DIR` (optional), `BCRYPT_ROUNDS`, `NODE_ENV=production` (secure cookies, trust proxy).

## Regression test
```
cd frontend && npm run build && npx vite preview --port 4173 &
node tests/e2e/regression.js
```
