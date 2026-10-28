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
