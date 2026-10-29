# TODO
- [x] Phase 0 baseline
- [x] Phase 1 front-end integrity (gate report pending approval)
- [x] Phase 2 backend foundation (gate report pending approval)
- [x] Phase 3 academic API (gate report pending approval)
- [ ] Phase 4 communication, logs, reports, backup
- [ ] Phase 5 integration + re-skin (also: instructor assignment creation, course editing, lesson content)
- [ ] Phase 6 Chapter 4 evaluation tooling
- [ ] Phase 7 deployment + hardening
Known, deferred: seed dates in 2024; Progress/dashboard activity charts are sample data; category Edit removed (no CRUD scope); Profile password check compares plaintext (replaced by bcrypt in Phase 2).
Phase 2 carry-over: D12 owner decision (instructor sign-up); no HTTPS/Secure cookie or CSP until Phase 7; no uploads yet; password reset by email is out of scope (admin resets by recreating the account).
Phase 3 carry-over: quiz question editing; per-student submission re-open by instructor; materials/submissions are stored on local disk (ephemeral on Render free tier - Phase 7); no virus scanning of uploads (out of MVP scope, noted as a limitation).
