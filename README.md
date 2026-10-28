# CloudLearn

Cloud-based e-learning platform for hybrid learning. Case study for the Department of Computer Science, Yaba College of Technology (HND seminar).

## Layout
- `frontend/`  React 19 + Vite + Tailwind 4 + Recharts (from Figma Make, repaired in Phase 1)
- `backend/`   Node + Express + SQLite (Phase 2 onward; empty now)
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
Phase 1 (front-end integrity) complete pending owner approval. No backend yet: data lives in the browser.

## Regression test
```
cd frontend && npm run build && npx vite preview --port 4173 &
node tests/e2e/regression.js
```
