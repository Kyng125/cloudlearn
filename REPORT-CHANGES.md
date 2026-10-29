# Report changes (HELD, not applied)
Items where the seminar report and the build diverge. Apply after the owner releases the hold.
1. Six-table schema (Table 3.x) cannot support FR9-11 (forums, messaging, notifications, logs); build uses ~18 tables.
2. Stack wording: report names MySQL/PHP; build uses Node/Express/SQLite (SQL MySQL-compatible).
3. Security wording: report claims should match what is actually implemented (bcrypt, session cookie, throttle, RBAC); no 2FA, no SOC 2, no SLA, no CDN.
4. Reports: three real reports (Users, Course Performance, Assessment Results); Financial Summary removed (no payments in scope).
5. Backup: database file backup/restore, not cloud snapshotting.
6. Enrolment is student-only.
7. Evaluation (Chapter 4): results come from Phase 6 tooling, not from the Figma prototype.
8. Table count: the build has 20 tables (the report's six plus sessions and login_attempts for authentication, and the academic/communication tables).
9. Account creation: self-registration creates students only; instructors are created by an administrator (pending D12).
10. Authentication detail to state accurately: bcrypt-hashed passwords, httpOnly session cookie, persistent login throttle, role-based access checks on the server.
11. FR5/FR7: uploads are stored on the application server's disk (not object storage) with a type allow-list and size limit.
12. FR9: quiz scoring and timing are enforced on the server; answers are saved progressively; the report's wording about client-side scoring, if any, should be corrected.
13. Late-submission logic (Figure 3.5) is implemented against the server clock.
14. FR10: forums are per-course and visible to enrolled students, the instructor and admins; direct messaging is limited to student<->own instructors and admin<->anyone.
15. FR12: three reports (Users, Course Performance, Assessment Results) with CSV export; they are generated from committed records and reconciled against raw rows in the tests.
16. Logging: the activity log records authentication, administrative and academic events from the server.
17. Backup/recovery: online database snapshot plus uploaded files, validated restore with automatic safety copy; backups are manual.
