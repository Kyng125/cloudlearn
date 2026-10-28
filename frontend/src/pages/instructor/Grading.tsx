import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, Tabs, Modal, Field, Input, Textarea, SectionHeader, EmptyState } from '../../components/UI';

export default function Grading() {
  const { currentUser, courses, assignments, submissions, gradeSubmission, getUserById } = useApp();
  if (!currentUser) return null;

  const [tab, setTab] = useState('pending');
  const [gradeModal, setGradeModal] = useState<string | null>(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  const myCourses = courses.filter(c => c.instructorId === currentUser.id);
  const myAssignments = myCourses.flatMap(c => assignments.filter(a => a.courseId === c.id).map(a => ({ ...a, course: c })));
  const myAssignmentIds = new Set(myAssignments.map(a => a.id));

  const mySubmissions = submissions
    .filter(s => myAssignmentIds.has(s.assignmentId))
    .map(s => {
      const assignment = myAssignments.find(a => a.id === s.assignmentId)!;
      const student = getUserById(s.studentId);
      return { ...s, assignment, student };
    });

  const filtered = mySubmissions.filter(s => {
    if (tab === 'pending') return s.status === 'submitted';
    if (tab === 'graded') return s.status === 'graded';
    return true;
  });

  const activeSubmission = mySubmissions.find(s => s.id === gradeModal);
  const maxPoints = activeSubmission?.assignment?.maxPoints || 100;

  const handleGrade = () => {
    if (!gradeModal || !grade) return;
    const g = Math.min(maxPoints, Math.max(0, parseFloat(grade)));
    gradeSubmission(gradeModal, g, feedback);
    setGradeModal(null);
    setGrade('');
    setFeedback('');
  };

  return (
    <DashboardLayout>
      <SectionHeader title="Grading" description="Review and grade student submissions" />

      <div className="mb-5">
        <Tabs tabs={[
          { id: 'pending', label: 'Pending Review', count: mySubmissions.filter(s => s.status === 'submitted').length },
          { id: 'graded', label: 'Graded', count: mySubmissions.filter(s => s.status === 'graded').length },
          { id: 'all', label: 'All', count: mySubmissions.length },
        ]} active={tab} onChange={setTab} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title={tab === 'pending' ? 'No pending submissions' : 'No submissions'} description={tab === 'pending' ? "You're all caught up! No submissions need review." : ''} />
      ) : (
        <div className="space-y-4">
          {filtered.map(s => {
            const pct = s.grade !== null ? Math.round((s.grade / s.assignment!.maxPoints) * 100) : null;
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar src={s.student?.avatar} name={s.student?.name || ''} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-[#f0f4ff]">{s.student?.name}</h3>
                        {s.isLate && <Badge variant="red">Late</Badge>}
                      </div>
                      <p className="text-sm font-medium text-blue-400 mb-1">{s.assignment?.title}</p>
                      <p className="text-xs text-[#4a5a7a]">{s.assignment?.course?.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-[#6b7fa8]">
                        <span>📎 {s.fileName}</span>
                        <span>📅 Submitted {new Date(s.submittedAt).toLocaleDateString()}</span>
                        <span>🏆 Max: {s.assignment?.maxPoints} pts</span>
                      </div>
                      {s.content && <p className="text-sm text-[#a0b4d0] mt-2 line-clamp-2">{s.content}</p>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {pct !== null ? (
                      <div>
                        <div className="text-2xl font-bold" style={{ color: pct >= 90 ? '#10b981' : pct >= 75 ? '#3b82f6' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                          {s.grade}/{s.assignment?.maxPoints}
                        </div>
                        <Badge variant={pct >= 75 ? 'green' : pct >= 60 ? 'yellow' : 'red'}>{pct}%</Badge>
                        <div className="mt-2">
                          <Button size="xs" variant="ghost" onClick={() => { setGradeModal(s.id); setGrade(String(s.grade)); setFeedback(s.feedback || ''); }}>
                            Edit
                          </Button>
                        </div>
                        {s.feedback && <p className="text-xs text-[#4a5a7a] mt-1 max-w-48 text-left">"{s.feedback}"</p>}
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => { setGradeModal(s.id); setGrade(''); setFeedback(''); }}>Grade</Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!gradeModal} onClose={() => setGradeModal(null)} title="Grade Submission" size="lg">
        {activeSubmission && (
          <div className="space-y-4">
            <div className="p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.07)]">
              <div className="font-medium text-[#f0f4ff]">{activeSubmission.assignment?.title}</div>
              <div className="text-sm text-[#6b7fa8]">By {activeSubmission.student?.name} · {activeSubmission.fileName}</div>
              <div className="text-sm text-[#a0b4d0] mt-2">{activeSubmission.content}</div>
            </div>
            <Field label={`Score (out of ${maxPoints})`} required>
              <Input type="number" value={grade} onChange={e => setGrade(e.target.value)} min={0} max={maxPoints} placeholder={`0 - ${maxPoints}`} />
            </Field>
            {grade && (
              <div className="text-sm text-[#6b7fa8]">
                Percentage: <span className="font-bold text-[#f0f4ff]">{Math.round(parseFloat(grade) / maxPoints * 100)}%</span>
                {' '}— {parseFloat(grade) >= maxPoints * 0.9 ? '🌟 Excellent!' : parseFloat(grade) >= maxPoints * 0.75 ? '👍 Good' : parseFloat(grade) >= maxPoints * 0.6 ? '📈 Passing' : '❌ Below passing'}
              </div>
            )}
            <Field label="Feedback for student">
              <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={4}
                placeholder="Provide constructive feedback to help the student improve..." />
            </Field>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setGradeModal(null)}>Cancel</Button>
              <Button onClick={handleGrade} disabled={!grade}>Submit Grade</Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
