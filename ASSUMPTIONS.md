# Assumptions (all ASSUMED until owner confirms)
- A1 Node 20 + Express + SQLite (better-sqlite3); SQL kept MySQL-compatible.
- A2 One service serves API and built front end.
- A3 bcrypt, httpOnly session cookie, persistent login throttle.
- A4 Uploads on local disk behind authenticated routes.
- A5 Must run on Windows and move between laptops.
- A6 HND CS course names in the re-skin are placeholders; owner may supply the real module list.
- A7 New-user temporary password in admin Add User is `welcome123` (prototype only; replaced by a server-generated reset flow in Phase 2).
- A8 Seed dates remain 2024 until the Phase 2 seed script uses relative dates.
