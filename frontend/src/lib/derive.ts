import type { Enrollment, Submission, Assignment } from '../types';

// Derived, state-backed figures. Replaces the hard-coded demo charts and the
// "grade is already a percentage" assumption in the original generated UI.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Enrolments grouped by calendar month (chronological), from real enrolment records. */
export function monthlyEnrollments(enrollments: Enrollment[]): { month: string; students: number }[] {
  const buckets = new Map<string, number>();
  for (const e of enrollments) {
    const key = e.enrolledAt.slice(0, 7); // YYYY-MM
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, students]) => ({ month: `${MONTHS[parseInt(key.slice(5, 7), 10) - 1]} ${key.slice(2, 4)}`, students }));
}

/** Grade as a percentage of the assignment's own maximum score. */
export function gradePercent(sub: Submission, assignments: Assignment[]): number | null {
  if (sub.grade === null) return null;
  const max = assignments.find(a => a.id === sub.assignmentId)?.maxPoints || 100;
  return Math.round((sub.grade / max) * 100);
}

export function averageGradePercent(subs: Submission[], assignments: Assignment[]): number {
  const pcts = subs.map(s => gradePercent(s, assignments)).filter((p): p is number => p !== null);
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
}
