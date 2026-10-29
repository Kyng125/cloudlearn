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
| D12 | Self-registration creates students only; instructors/admins are created or promoted by an admin | PROPOSED - owner to confirm | Differs from the Figma sign-up screen; see backend/CONTRACT-CHECK-PHASE2.md |
| D13 | Sessions are server-side rows (sha256 of cookie value), 7-day expiry, revoked on deactivation, role change and password change | DECIDED | |
| D14 | Login throttle: 5 failures per email+IP per 15 min, 20 per IP; stored in DB so restarts do not reset it | DECIDED | Numbers are ASSUMED defaults, configurable |
| D15 | Mutating API calls with a cross-origin `Origin` header are refused (on top of SameSite=Lax) | DECIDED | |
| D16 | Admin-created users get a server-generated one-time temporary password and must change it | DECIDED | Supersedes A7 |
| D17 | Password rule 6 to 72 characters (matches front end minimum; 72 is the bcrypt limit) | ASSUMED | Owner may want a stronger minimum |
