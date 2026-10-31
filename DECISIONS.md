# Decisions
| ID | Decision | Status | Note |
|----|----------|--------|------|
| D1 | Thin backend + database | CONFIRMED (owner) | Phase 2+ |
| D2 | Re-skin to Computer Science HND context | CONFIRMED (owner) | Phase 5 |
| D3 | Report corrections held back | CONFIRMED (owner) | Logged in REPORT-CHANGES.md |
| D4 | npm + package-lock.json, pnpm lock removed | DECIDED | Windows portability, one package manager |
| D5 | Keep Figma UI structure and context.tsx function names | DECIDED | Lets Phase 5 swap internals for an API client |
| D6 | localStorage state is versioned (STATE_VERSION=2); mismatched saves are discarded | DECIDED | Old saves had static-helper data shapes |
| D7 | Admin cannot delete/deactivate self or the last active admin | DECIDED | Lock-out prevention |
| D8 | Only students can enrol | DECIDED | Instructor/admin enrolment created inconsistent data |
| D9 | Unsupported features are labelled "sample"/"simulated"/removed, not faked | DECIDED | Activity logs, backup, security toggles, cloud settings until backend exists |
| D10 | Grades shown as % of each assignment's max points | DECIDED | Mixed-scale averages were wrong |
| D11 | `bcryptjs` (pure JS) instead of native `bcrypt` | DECIDED | Supersedes A3 wording; avoids a native build on Windows (A5) |
| D12 | Self-registration creates students only; instructors/admins are created or promoted by an admin | CONFIRMED (owner) | Differs from the Figma sign-up screen; see backend/CONTRACT-CHECK-PHASE2.md |
| D13 | Sessions are server-side rows (sha256 of cookie value), 7-day expiry, revoked on deactivation, role change and password change | DECIDED | |
| D14 | Login throttle: 5 failures per email+IP per 15 min, 20 per IP; stored in DB so restarts do not reset it | DECIDED | Numbers are ASSUMED defaults, configurable |
| D15 | Mutating API calls with a cross-origin `Origin` header are refused (on top of SameSite=Lax) | DECIDED | |
| D16 | Admin-created users get a server-generated one-time temporary password and must change it | DECIDED | Supersedes A7 |
| D17 | Password rule 6 to 72 characters (matches front end minimum; 72 is the bcrypt limit) | ASSUMED | Owner may want a stronger minimum |
| D18 | Uploads authorised BEFORE the file is accepted (middleware order), stored under random names outside the web root, extension allow-list, 10 MB limit, forced-download responses | DECIDED | Verified by tests and by a mutation check |
| D19 | Late flag is computed from the server clock; client-supplied lateness/time is ignored | DECIDED | TC07 |
| D20 | A submission can be replaced until grading is recorded; once a grade exists it is locked | CONFIRMED (owner, with the clarification "as long as it does not affect grading") | Interpreted as: the lock starts when a grade is written |
| D21 | Quizzes: server holds the clock and answer key; answers saved progressively; expired attempts are scored from saved answers only; 5 s grace | DECIDED | TC09 |
| D22 | Exams allow one attempt; ordinary quizzes unlimited retakes with history | ASSUMED (A11) | |
| D26 | 10 MB upload limit | CONFIRMED (owner) | |
| D23 | Course deletion refused once students are enrolled (unpublish instead); quiz deletion refused once attempted | DECIDED | Protects student records |
| D24 | Upgraded multer 1.x to 2.x after `npm audit` reported a crash vulnerability in its multipart parser | DECIDED | `npm audit --omit=dev`: 0 vulnerabilities |
| D25 | Price, rating, tags and per-lesson resources from the Figma data model are not implemented | DECIDED | Outside MVP scope; hidden in Phase 5 |
| D27 | Forum access = enrolled students, the course instructor and admins; non-members get 403 (content) | DECIDED | TC10 |
| D28 | Direct messages: student <-> instructors of courses they are enrolled in, admin <-> anyone; everything else 403 (same answer for unknown users) | ASSUMED (A14) | Prevents spam and user enumeration |
| D29 | Three reports: Users (admin only), Course Performance and Assessment Results (admin all, instructor own courses); CSV via `?format=csv` | DECIDED | TC11 |
| D30 | CSV cells starting with = + - @ are prefixed with an apostrophe; UTF-8 BOM added for Excel | DECIDED | Formula-injection protection |
| D31 | Backup = SQLite online-backup snapshot + copy of uploads, stored under `BACKUP_DIR`; restore validates integrity and layout, takes an automatic safety backup, replaces all tables in one transaction, restores files, and revokes all sessions | DECIDED | Backups contain password hashes: protect the backup disk |
| D32 | Activity log is written by the server for real events only (never client supplied); attempted passwords are never logged | DECIDED | |
| D33 | Notification types limited to the front-end union (assignment, grade, message, course, quiz, system) | DECIDED | |
| D34 | Front end holds no data of its own: `context.tsx` loads every slice from the API per role; `data.ts` and all localStorage code removed | DECIDED | Phase 5; sessions restored through `/auth/me` |
| D35 | Assignment submissions require a file (notes optional); replace allowed until graded | CONFIRMED (D20) | |
| D36 | Quiz taker is driven by the server deadline; answers saved by debounced PUT; expired attempts auto-submit | DECIDED | |
| D37 | Admin Categories page is read-only (fixed list in `lib/constants.ts`); System page lists enforced controls instead of fake toggles | DECIDED | No category CRUD in scope |
| D38 | Forgot-password shows "ask an administrator" (no email delivery in MVP) | DECIDED | |
| D39 | Zero-byte uploads are refused (400) and removed from disk | DECIDED | Phase 6 error tests found they were accepted |
| D40 | Upload destination folder is re-created on demand | DECIDED | Phase 6: uploads returned 500 if the folder vanished while running |
| D41 | Register, login and change-password use asynchronous bcrypt; registration checks the email and inserts with no await between, so simultaneous duplicates give one 201 and 409s | DECIDED | Phase 6 load test: synchronous hashing froze every other request |
| D42 | Server keep-alive 65 s (headers 66 s) | DECIDED | Phase 6 load test: ECONNRESET on reused sockets after ~5 s stalls |
| D43 | bcrypt cost stays at 10 (pure-JS bcryptjs). 100 students signing in within the same second wait up to ~8 s; 25 wait under 1 s | CONFIRMED (owner: keep as is) | Lecturers should stagger the start of class quizzes; revisit if more than about 50 students sign in at once |
| D44 | Deploy on Render's free plan as a single web service (API + built front end). Data is ephemeral there: DB, uploads and backups are wiped on restart, redeploy and after ~15 idle minutes (Render docs). Server re-creates the admin (and optional demo data) on every cold start and shows a demo-hosting notice | CONFIRMED (owner chose free plan; owner assumed sleep would not matter, corrected with the docs) | Persistent disk needs a paid plan; no code change needed to move there |
| D45 | The admin account never shares the demo password: `ADMIN_PASSWORD` (10+ chars) is required in production for an empty database | DECIDED | Public URL |
| D46 | No demo accounts by default in production (`BOOTSTRAP_DEMO=0`); owner may set 1 for presentations | CONFIRMED (owner: "as you plan") | |
| D47 | CSP (self scripts; Google Fonts; https images), HSTS on secure deployments, Permissions-Policy, trust proxy = 1 hop | DECIDED | Verified with the crawl and TC01-13 in production mode |
| D48 | Backups can be downloaded as a .zip and uploaded back (admin only). Upload validates names (flat generated upload names only), total unpacked size (600 MB) before inflating, SQLite integrity and table set, 100 MB upload cap; it never restores by itself | DECIDED (owner requested) | Lets data survive Render free-plan resets (D44) |
| D49 | `fflate` (pure JS, zero dependencies) used for zip; chosen over zip libraries with a history of path-traversal bugs | DECIDED | npm audit: 0 vulnerabilities |
