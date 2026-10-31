# TODO
- [x] Phase 0 baseline
- [x] Phase 1 front-end integrity (gate report pending approval)
- [x] Phase 2 backend foundation (gate report pending approval)
- [x] Phase 3 academic API (gate report pending approval)
- [x] Phase 4 communication, logs, reports, backup (gate report pending approval)
- [x] Phase 5 integration + re-skin (gate report pending approval)
- [x] Phase 6 Chapter 4 evaluation tooling (gate report pending approval)
- [x] Phase 7 deployment + hardening (code and guides done; deploy itself is the owner's step - gate report pending approval)
Known, deferred: seed dates in 2024; Progress/dashboard activity charts are sample data; category Edit removed (no CRUD scope); Profile password check compares plaintext (replaced by bcrypt in Phase 2).
Phase 2 carry-over: D12 owner decision (instructor sign-up); no HTTPS/Secure cookie or CSP until Phase 7; no uploads yet; password reset by email is out of scope (admin resets by recreating the account).
Phase 3 carry-over: quiz question editing; per-student submission re-open by instructor; materials/submissions are stored on local disk (ephemeral on Render free tier - Phase 7); no virus scanning of uploads (out of MVP scope, noted as a limitation).
Phase 4 carry-over: no email/SMS delivery of notifications (in-app only); no per-user notification preferences stored server-side (Profile toggles stay local in Phase 5 unless requested); no attachments in messages; activity log has no retention/pruning; backups are not scheduled or downloadable from the browser.
Phase 5 carry-over: course thumbnails use external image URLs (blocked in the test sandbox, placeholder module names in seed (A6) until the real HND module list is supplied); Profile notification toggles are local only; no password reset flow; quiz question editing after creation not offered; e2e covers TC01-13 happy paths plus one rejection (bad password, bad file type), not every error branch.
Phase 6 carry-over: D43 sign-in burst latency (owner: keep as is, stagger quiz starts; mention in the user guide); load numbers are from a 2-CPU sandbox, repeat on the deployment target in Phase 7; R7 (corrupt backup) asserts data untouched but not the exact error text; no test above 100 concurrent students.
Phase 7 owner steps: push to GitHub, create the Render Blueprint, set ADMIN_EMAIL / ADMIN_PASSWORD (+ BOOTSTRAP_DEMO=1 for the demo), run tests/smoke-live.js against the live URL, tick docs/WINDOWS.md. Deferred: downloadable/uploadable backups (would let data survive free-plan resets), real HND module names (A6), external thumbnails.
