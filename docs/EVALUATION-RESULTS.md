# CloudLearn evaluation results

Generated 2026-10-30T23:26:12.198Z on Node v22.23.4, 2 CPU(s), linux. Re-create with `node tests/run-evaluation.js`.

**Overall: all checks passed**

## 1. Backend automated tests (API, security, data rules)

139 of 139 passed (0 failed). Includes the access-control matrix: every API route called by 7 kinds of caller (anonymous, enrolled student, peer student, non-enrolled student, owning instructor, other instructor, admin).

## 2. Functional test cases TC01-TC13 (real browser, real server and database)

| Test | Desktop | Mobile |
|---|---|---|
| TC01 wrong password rejected | PASS | PASS |
| TC02 student self-registers (no instructor option) | PASS | PASS |
| TC03 student enrols in a course | PASS | PASS |
| TC04 complete a lesson | PASS | PASS |
| TC05 reject disallowed upload type | PASS | PASS |
| TC06 submit assignment with file | PASS | PASS |
| TC07 take a quiz and see result | PASS | PASS |
| TC08 instructor sees and grades submission | PASS | PASS |
| TC09 instructor creates assignment | PASS | PASS |
| TC10 admin creates instructor with temp password | PASS | PASS |
| TC11 admin activity log lists events | PASS | PASS |
| TC12 admin report renders | PASS | PASS |
| TC13 admin creates backup | PASS | PASS |

## 3. Screen crawl

58 screens visited across student, instructor and admin roles at desktop and phone widths; 0 problems (console errors, failed API calls, bad text, horizontal overflow).

## 4. Error handling

| Test | Desktop | Mobile |
|---|---|---|
| E1 lockout after repeated wrong passwords shows a clear message | PASS | PASS |
| E2 correct password is still refused while locked out | PASS | PASS |
| E3 registration: duplicate email and weak password give field-level messages | PASS | PASS |
| E4 change password: wrong current password is rejected with a message | PASS | PASS |
| E5 file over 10 MB is refused and nothing is saved | PASS | PASS |
| E6 empty file is refused | PASS | PASS |
| E7 double-clicking Submit creates one submission | PASS | PASS |
| E8 enrolling twice leaves one enrolment | PASS | PASS |
| E9 expired quiz attempt: scored from saved answers only, no error | PASS | PASS |
| E10 session cleared mid-use: next action returns to sign-in with a message | PASS | PASS |
| E11 server unreachable: action shows an error, page stays usable, recovers on restart | PASS | PASS |
| E12 admin: creating a user with an existing email is refused in the dialog | PASS | PASS |
| E13 admin cannot deactivate or delete their own account from the UI | PASS | PASS |

## 5. Recovery

| Test | Desktop | Mobile |
|---|---|---|
| R1 admin creates a backup from the browser and it is listed | PASS | PASS |
| R2 data changed after the backup (new user, new upload, grade edit) | PASS | PASS |
| R3 restore from the browser: confirmation required, everyone signed out | PASS | PASS |
| R4 after restore: post-backup changes are gone, original data and files are back | PASS | PASS |
| R5 sessions that existed before the restore no longer work | PASS | PASS |
| R6 restore took an automatic safety backup of the state it replaced | PASS | PASS |
| R7 a corrupted backup is refused and current data is untouched | PASS | PASS |
| R8 missing uploads folder: downloads fail cleanly, uploads work again, server stays up | PASS | PASS |
| R9 server restart: data and signed-in sessions survive | PASS | PASS |

## 6. Load (concurrent students taking a timed quiz; bcrypt cost 10, single Node process, SQLite)

### New students registering and taking the quiz at the same moment

| Concurrent students | Requests | Duration (s) | Req/s | p50 (ms) | p95 (ms) | Max (ms) | Errors |
|---|---|---|---|---|---|---|---|
| 25 | 350 | 4.0 | 87 | 2 | 2060 | 2072 | 0 |
| 50 | 700 | 5.9 | 118 | 3 | 3093 | 4199 | 0 |
| 100 | 1400 | 10.5 | 133 | 48 | 6969 | 8621 | 0 |

### Existing students signing in and taking the quiz at the same moment

| Concurrent students | Requests | Duration (s) | Req/s | p50 (ms) | p95 (ms) | Max (ms) | Errors |
|---|---|---|---|---|---|---|---|
| 25 | 325 | 3.8 | 86 | 5 | 913 | 2161 | 0 |
| 50 | 650 | 6.0 | 109 | 8 | 3398 | 4375 | 0 |
| 100 | 1300 | 9.9 | 131 | 7 | 7846 | 7881 | 0 |

Each student: sign in or register, list courses/assignments/quizzes/notifications, start a quiz attempt, save answers progressively, submit. Latency is dominated by password hashing (CPU-bound); all other endpoints stay well under a second at 100 concurrent students.

## 7. Not covered

- Windows run, HTTPS / secure cookie, and the deployed (Render) environment: Phase 7.
- Penetration testing beyond the access matrix, SQL injection and upload checks in the backend suite.
- Loads above 100 simultaneous students, multi-instance deployment.
