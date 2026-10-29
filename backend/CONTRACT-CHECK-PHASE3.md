# Phase 3 contract cross-check (academic API vs front end `context.tsx` / `data.ts`)
Evidence: OBSERVED from the front-end code; nothing in the front end is changed until Phase 5.

| # | Front end today | Backend (Phase 3) | Resolution in Phase 5 |
|---|---|---|---|
| 1 | One global `courses` array with `modules[]` embedded | `GET /api/courses` (no modules), `GET /api/courses/:id` (modules + lessons); public catalogue `GET /api/public/courses` | Fetch per screen; Landing/Courses use the public or role-scoped list |
| 2 | Course has `duration` (string), `price`, `rating`, `tags` | API gives `durationMinutes`, `enrolledCount`; **price, rating, tags are not stored** | Hide price/rating/tags (6 usages) or format duration from minutes. Out of MVP scope |
| 3 | Lesson `resources[]` (per-lesson attachments) | Files are **course-level materials** (`/api/courses/:id/materials`) | Show a "Course materials" list; drop per-lesson resources |
| 4 | Lesson types `video | document | presentation` | Same values (enforced) | Compatible |
| 5 | `Enrollment.progress/completedLessons/lastAccessed` | `progress` and `completedLessons` computed; `lastAccessed` not provided | Drop lastAccessed |
| 6 | `submitAssignment(id, content, fileName)` records a file *name* only | `POST /api/assignments/:id/submit` multipart with a real file (+ optional `content` note); late flag set by server | Real file picker; form upload; show server's `isLate` |
| 7 | Submission `status: submitted|graded|pending` | API returns `submitted|graded`; "pending" = no submission row | Derive pending in the UI |
| 8 | `gradeSubmission(id, grade, feedback)` | `PUT /api/submissions/:id/grade {score, feedback}`; score must be 0..maxPoints | Rename field; show validation message |
| 9 | `createQuiz` makes a published quiz with `availableFrom/availableUntil` (never shown or enforced) | Quiz created **unpublished**; publish with `PATCH /api/quizzes/:id {isPublished:true}`; no availability window | QuizBuilder calls create then publish; remove the two date fields |
| 10 | `submitQuizAttempt(quizId, answers, timeTaken)` scores in the browser | Flow is `POST /quizzes/:id/attempts` (start, server clock) -> `PUT /attempts/:id/answers` (progressive save) -> `POST /attempts/:id/submit`; score and answer key come only from the server | Rewrite QuizTaker around the three calls; client timer is display only; resume an open attempt on reload |
| 11 | Quiz questions sent to the browser with `correctIndex` | Answer key withheld until the attempt is completed (`review`) | Result screen reads `attempt.review` |
| 12 | Students could take any quiz in an enrolled course | Only **published** quizzes of enrolled courses; exams allow **one** attempt (A11) | Hide "Retake" on exams |
| 13 | Notifications created locally | Created by events (enrolment, submission, grade, new assignment, quiz published); `GET /api/notifications`, `POST /api/notifications/:id/read` | Phase 4 adds mark-all-read |
| 14 | Instructor "Students" tab reads enrolments client-side | `GET /api/courses/:id/students` (owner/admin only) | Use the endpoint |
| 15 | Instructors/admins could "enrol" | Enrolment is student-only (403 otherwise) | Already hidden in Phase 1 |
