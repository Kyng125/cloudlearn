# Phase 4 contract cross-check (communication, log, reports, backup vs front end)
Evidence: OBSERVED from front-end code; the front end is unchanged until Phase 5.

| # | Front end today | Backend (Phase 4) | Resolution in Phase 5 |
|---|---|---|---|
| 1 | `DiscussionThread {id,courseId,authorId,title,body,createdAt,replies[]}`; `postDiscussion(courseId,title,body)`, `replyToDiscussion(threadId,body)` | `GET /api/threads` (role-scoped), `GET /api/courses/:id/threads`, `POST /api/courses/:id/threads`, `POST /api/threads/:id/posts`; thread has the same fields plus `authorName/authorRole/courseTitle`; replies carry names | Compatible; swap local state for calls. Add delete (own post/thread, or instructor moderation) if wanted |
| 2 | Message `{id,fromId,toId,subject,body,sentAt,isRead}`; any user can be picked | Same fields (+`fromName`,`toName`); **recipients restricted** (student <-> own instructors, admin <-> anyone); `GET /api/contacts` lists who the caller may message | Compose dropdown must use `/contacts`. `markMessageRead` -> `POST /messages/:id/read` (or just open the message) |
| 3 | Notification `{type: assignment|grade|message|course|quiz|system, link?}` | Types aligned to that union; no `link`; `unreadCount`, `read-all` added | Drop `link` or derive it from `type`; bell badge uses `unreadCount` |
| 4 | Admin "Activity Logs" is a static sample list (`time,user,action,ip,status`) | `GET /api/admin/activity-logs?status=&q=&limit=&offset=` -> `{logs[{id,at,user,action,detail,ip,status}], total}`; events: login/logout/register, user admin actions, course create/publish/delete, enrol, material upload, submissions, grading, quiz create/publish/complete, discussions, reports, backups | Replace sample with API; rename `time`->`at`; remove the "sample" labels |
| 5 | Admin Reports computed in the browser | `GET /api/reports/users` (admin), `/course-performance`, `/assessment-results` (admin: all, instructor: own courses); add `?format=csv` for download | Render tables from JSON; Download links point at the CSV URL |
| 6 | Instructor/admin Analytics charts derive from local arrays | Can reuse `course-performance`/`assessment-results` rows | Use report endpoints for the numbers; keep charts |
| 7 | Backup page: simulated | `GET/POST /api/admin/backups`, `POST /api/admin/backups/:name/restore {confirm:true}`, `DELETE` | Real list/create/restore/delete. No browser download (copy the folder from the server). Restore signs everyone out |
| 8 | Instructor/admin notifications pages (Phase 1) | Same `/notifications` endpoints for every role | Compatible |
