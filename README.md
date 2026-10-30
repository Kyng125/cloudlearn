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
Phases 1 to 6 complete (front end repaired and connected to the API, backend auth/roles, academic API, communication/reports/backup). Phase 7 (deployment) remains.

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
cd frontend && npm run build   # backend serves frontend/dist
# seed a temp DB and start backend (see backend/README), then:
NODE_PATH=$(npm root -g) node tests/e2e/crawl.js   # every screen, 3 roles, desktop + mobile
NODE_PATH=$(npm root -g) node tests/e2e/flow.js    # TC01-13 flows, desktop + mobile
```

## Full evaluation (Chapter 4)
```
NODE_PATH=$(npm root -g) node tests/run-evaluation.js [--skip-load]   # writes docs/EVALUATION-RESULTS.md
```
Individual suites: `cd backend && npm test` (includes access-control matrix), `tests/e2e/{crawl,flow,errors,recovery}.js`, `tests/load/load.js` (`SCENARIO=login` for the sign-in burst).
