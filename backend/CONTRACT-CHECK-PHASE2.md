# Phase 2 contract cross-check (API vs front end `context.tsx`)
Status of each item: OBSERVED from code unless marked. Nothing here is changed in the front end until Phase 5.

| # | Front end today | Backend (Phase 2) | Resolution |
|---|---|---|---|
| 1 | `login(email,pw): boolean` and `register(...): boolean` are synchronous | async HTTP: `POST /api/auth/login`, `/register` | Signatures become `Promise<boolean>`; `Auth.tsx` call sites need `await` + loading state (Phase 5) |
| 2 | Registration offers **Student or Instructor** (`Auth.tsx` line ~153) | Registration **always creates a student**; `role` in body is ignored (tested) | **DECISION NEEDED (D12).** Recommended: remove the selector; admins create/promote instructors. See below |
| 3 | `User.password` held on the client; Profile compares it to change password | No password ever returned; `POST /api/auth/change-password {currentPassword,newPassword}` | Profile security tab calls the API (Phase 5) |
| 4 | Single generic login error | 401 invalid credentials, 403 deactivated, 429 throttled (+`Retry-After`) | Show `error` text from the server; show retry time on 429 |
| 5 | Admin Add User uses fixed password `welcome123` | Server generates a one-time `temporaryPassword`; user has `mustChangePassword` | Show the password once in a dialog; force change on first login (Phase 5). Replaces assumption A7 |
| 6 | `User` fields id,name,email,role,avatar,bio,phone,location,joinedAt,isActive | Same names via `publicUser` (+`mustChangePassword`); ids are strings (`u_xxxx`) | Compatible |
| 7 | Activity log rows `{time,user,action,ip,status}` | `GET /api/admin/activity-logs` returns `{at,user,action,detail,ip,status}` | Rename `time`->`at` in the UI (Phase 5) |
| 8 | `toggleUserActive`, `deleteUser`, client-side guards | `PATCH/DELETE /api/admin/users/:id` with the same guards enforced server-side, plus session revocation | Client guards stay for UX; server is authoritative |
| 9 | Delete user always succeeds | 409 if the user owns courses/messages/posts ("deactivate instead") | UI must show the server message |
| 10 | Session = localStorage `currentUserId` | httpOnly cookie `cl_sid`; `GET /api/auth/me` restores the session | Replace restore logic with `/me` on load (Phase 5) |

## Decision needed: instructor self-registration (item 2)
The prototype lets anyone pick "Instructor" at sign-up. With a real backend that grants the ability to create courses, see student data and receive submissions with no vetting, so the API refuses it. Options: (a) **recommended** students only; admins create or promote instructors; (b) instructor sign-up creates a pending account an admin must approve (needs a new state and UI); (c) keep open instructor sign-up (not recommended).
