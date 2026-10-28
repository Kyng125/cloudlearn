# Report changes (HELD, not applied)
Items where the seminar report and the build diverge. Apply after the owner releases the hold.
1. Six-table schema (Table 3.x) cannot support FR9-11 (forums, messaging, notifications, logs); build uses ~18 tables.
2. Stack wording: report names MySQL/PHP; build uses Node/Express/SQLite (SQL MySQL-compatible).
3. Security wording: report claims should match what is actually implemented (bcrypt, session cookie, throttle, RBAC); no 2FA, no SOC 2, no SLA, no CDN.
4. Reports: three real reports (Users, Course Performance, Assessment Results); Financial Summary removed (no payments in scope).
5. Backup: database file backup/restore, not cloud snapshotting.
6. Enrolment is student-only.
7. Evaluation (Chapter 4): results come from Phase 6 tooling, not from the Figma prototype.
