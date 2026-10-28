import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Tabs, EmptyState, Modal, Field, Textarea, SectionHeader } from '../../components/UI';
import { type QuizAttempt } from '../../data';

// ── Assignments ──────────────────────────────────────────────────────────

export function Assignments() {
  const { currentUser, enrollments, assignments, submissions, submitAssignment, getCourseById } = useApp();
  if (!currentUser) return null;

  const [tab, setTab] = useState('pending');
  const [submitModal, setSubmitModal] = useState<string | null>(null);
  const [submitText, setSubmitText] = useState('');
  const [submitFile, setSubmitFile] = useState('submission.pdf');

  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const courseIds = myEnrollments.map(e => e.courseId);
  const myAssignments = assignments
    .filter(a => courseIds.includes(a.courseId))
    .map(a => {
      const course = getCourseById(a.courseId);
      const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id);
      const isLate = new Date() > new Date(a.dueDate);
      return { ...a, course, submission: sub, isLate };
    });

  const filtered = myAssignments.filter(a => {
    if (tab === 'pending') return !a.submission && !a.isLate;
    if (tab === 'submitted') return a.submission?.status === 'submitted';
    if (tab === 'graded') return a.submission?.status === 'graded';
    if (tab === 'overdue') return !a.submission && a.isLate;
    return true;
  });

  const handleSubmit = () => {
    if (!submitModal || !submitText.trim()) return;
    submitAssignment(submitModal, submitText, submitFile);
    setSubmitModal(null);
    setSubmitText('');
  };

  return (
    <DashboardLayout>
      <SectionHeader title="Assignments" description="Submit and track your coursework" />

      <div className="mb-5">
        <Tabs tabs={[
          { id: 'pending', label: 'Pending', count: myAssignments.filter(a => !a.submission && !a.isLate).length },
          { id: 'submitted', label: 'Submitted', count: myAssignments.filter(a => a.submission?.status === 'submitted').length },
          { id: 'graded', label: 'Graded', count: myAssignments.filter(a => a.submission?.status === 'graded').length },
          { id: 'overdue', label: 'Overdue', count: myAssignments.filter(a => !a.submission && a.isLate).length },
        ]} active={tab} onChange={setTab} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📝" title="No assignments" description={`No ${tab} assignments found`} />
      ) : (
        <div className="space-y-4">
          {filtered.map(a => {
            const due = new Date(a.dueDate);
            const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
            return (
              <Card key={a.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-[#f0f4ff]">{a.title}</h3>
                      {a.submission?.isLate && <Badge variant="red">Late</Badge>}
                      {!a.submission && a.isLate && <Badge variant="red">Overdue</Badge>}
                    </div>
                    <p className="text-xs text-blue-400 mb-2">{a.course?.title}</p>
                    <p className="text-sm text-[#a0b4d0] mb-3 leading-relaxed">{a.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-[#6b7fa8]">
                      <span>📅 Due: {a.dueDate}</span>
                      <span>🏆 {a.maxPoints} pts</span>
                      {!a.isLate && !a.submission && <span className={daysLeft <= 3 ? 'text-red-400' : ''}>{daysLeft > 0 ? `${daysLeft} days left` : 'Due today'}</span>}
                    </div>

                    {/* Grade */}
                    {a.submission?.status === 'graded' && (
                      <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl font-bold text-emerald-400">{a.submission.grade}/{a.maxPoints}</span>
                          <Badge variant="green">{Math.round((a.submission.grade! / a.maxPoints) * 100)}%</Badge>
                        </div>
                        {a.submission.feedback && <p className="text-xs text-[#6b7fa8]">"{a.submission.feedback}"</p>}
                      </div>
                    )}

                    {a.submission?.status === 'submitted' && (
                      <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-center gap-2">
                        <span className="text-blue-400">📎</span>
                        <span className="text-sm text-[#a0b4d0]">{a.submission.fileName} — submitted {new Date(a.submission.submittedAt).toLocaleDateString()}</span>
                        <Badge variant="blue">Pending Review</Badge>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {!a.submission && (
                      <Button size="sm" variant={a.isLate ? 'danger' : 'primary'} onClick={() => setSubmitModal(a.id)}>
                        {a.isLate ? 'Submit Late' : 'Submit'}
                      </Button>
                    )}
                    {a.submission?.status === 'submitted' && <Badge variant="blue">Submitted</Badge>}
                    {a.submission?.status === 'graded' && <Badge variant="green">Graded</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!submitModal} onClose={() => setSubmitModal(null)} title="Submit Assignment" size="lg">
        <div className="space-y-4">
          <Field label="Your submission notes">
            <Textarea value={submitText} onChange={e => setSubmitText(e.target.value)} rows={5}
              placeholder="Describe your approach, methodology, and key findings..." />
          </Field>
          <Field label="File name (simulated upload)">
            <input value={submitFile} onChange={e => setSubmitFile(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setSubmitModal(null)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!submitText.trim()}>Submit Assignment</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// ── Quiz List ──────────────────────────────────────────────────────────────

export function QuizList() {
  const { currentUser, enrollments, quizzes, quizAttempts, navigate, getCourseById } = useApp();
  if (!currentUser) return null;

  const [tab, setTab] = useState('available');
  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const courseIds = myEnrollments.map(e => e.courseId);

  const myQuizzes = quizzes
    .filter(q => courseIds.includes(q.courseId))
    .map(q => {
      const course = getCourseById(q.courseId);
      const attempt = quizAttempts.filter(a => a.quizId === q.id && a.studentId === currentUser.id).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
      return { ...q, course, attempt };
    });

  const filtered = myQuizzes.filter(q => {
    if (tab === 'available') return !q.attempt;
    if (tab === 'completed') return !!q.attempt;
    if (tab === 'exams') return q.isExam;
    return true;
  });

  return (
    <DashboardLayout>
      <SectionHeader title="Quizzes & Exams" description="Test your knowledge and track your performance" />

      <div className="mb-5">
        <Tabs tabs={[
          { id: 'available', label: 'Available', count: myQuizzes.filter(q => !q.attempt).length },
          { id: 'completed', label: 'Completed', count: myQuizzes.filter(q => !!q.attempt).length },
          { id: 'exams', label: 'Exams Only', count: myQuizzes.filter(q => q.isExam).length },
        ]} active={tab} onChange={setTab} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="❓" title="No quizzes found" description={`No ${tab} quizzes in your enrolled courses`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(q => {
            const pct = q.attempt ? Math.round((q.attempt.score / q.attempt.totalPoints) * 100) : 0;
            return (
              <Card key={q.id} className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-[#f0f4ff]">{q.title}</h3>
                      {q.isExam && <Badge variant="red">Exam</Badge>}
                    </div>
                    <p className="text-xs text-blue-400">{q.course?.title}</p>
                  </div>
                  {q.attempt && (
                    <div className="text-right">
                      <div className="text-2xl font-bold" style={{ color: pct >= q.passingScore ? '#10b981' : '#ef4444' }}>{pct}%</div>
                      <Badge variant={q.attempt.passed ? 'green' : 'red'}>{q.attempt.passed ? 'Passed' : 'Failed'}</Badge>
                    </div>
                  )}
                </div>

                <p className="text-sm text-[#a0b4d0] mb-4 line-clamp-2">{q.description}</p>

                <div className="flex flex-wrap gap-3 text-xs text-[#6b7fa8] mb-4">
                  <span>⏱ {q.duration} min</span>
                  <span>❓ {q.questions.length} questions</span>
                  <span>🎯 Pass: {q.passingScore}%</span>
                </div>

                {q.attempt ? (
                  <div className="text-xs text-[#4a5a7a]">
                    Completed {new Date(q.attempt.completedAt).toLocaleDateString()} · Score: {q.attempt.score}/{q.attempt.totalPoints} pts
                  </div>
                ) : (
                  <Button size="sm" onClick={() => navigate('student-quiz-take', { quizId: q.id })}>
                    {q.isExam ? 'Start Exam' : 'Take Quiz'} →
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Quiz Taker ──────────────────────────────────────────────────────────────

export function QuizTaker() {
  const { routeParams, quizzes, navigate, submitQuizAttempt, currentUser } = useApp();
  const quiz = quizzes.find(q => q.id === routeParams.quizId);

  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz ? quiz.duration * 60 : 0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [started, setStarted] = useState(false);

  // Answers, start time and the submitted flag live in refs so that the timer-expiry
  // submission always sees the latest answers (a stale closure used to submit them all blank).
  const answersRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const submittedRef = useRef(false);

  const finish = () => {
    if (!quiz || submittedRef.current) return;
    submittedRef.current = true;
    const finalAnswers = quiz.questions.map((_, i) => answersRef.current[i] ?? -1);
    const attempt = submitQuizAttempt(quiz.id, finalAnswers, Math.round((Date.now() - startedAtRef.current) / 1000));
    setResult(attempt);
    setSubmitted(true);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (!started || submitted) return;
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  useEffect(() => {
    if (started && !submitted && timeLeft === 0) finishRef.current();
  }, [started, submitted, timeLeft]);

  if (!quiz || !currentUser) {
    return <DashboardLayout><EmptyState icon="😕" title="Quiz not found" action={<Button onClick={() => navigate('student-quiz')}>Back</Button>} /></DashboardLayout>;
  }

  const handleAnswer = (idx: number) => {
    const next = [...answersRef.current];
    next[currentQ] = idx;
    answersRef.current = next;
    setAnswers(next);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const pct = result ? Math.round((result.score / result.totalPoints) * 100) : 0;

  if (!started) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto">
          <Card className="p-8 text-center">
            <div className="text-5xl mb-4">{quiz.isExam ? '📋' : '❓'}</div>
            <h1 className="font-display font-bold text-2xl text-[#f0f4ff] mb-2">{quiz.title}</h1>
            <p className="text-[#a0b4d0] mb-6">{quiz.description}</p>
            <div className="flex justify-center gap-6 text-sm text-[#6b7fa8] mb-8">
              <div><div className="text-2xl font-bold text-[#f0f4ff]">{quiz.questions.length}</div><div>Questions</div></div>
              <div><div className="text-2xl font-bold text-[#f0f4ff]">{quiz.duration}m</div><div>Duration</div></div>
              <div><div className="text-2xl font-bold text-[#f0f4ff]">{quiz.passingScore}%</div><div>Pass Score</div></div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-400 mb-6 text-left">
              ⚠️ Once started, the timer cannot be paused. Make sure you're in a quiet environment with a stable connection.
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => navigate('student-quiz')}>Cancel</Button>
              <Button onClick={() => { const blank = new Array(quiz.questions.length).fill(-1); answersRef.current = blank; startedAtRef.current = Date.now(); setAnswers(blank); setStarted(true); }}>
                {quiz.isExam ? 'Start Exam' : 'Start Quiz'}
              </Button>
            </div>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (submitted && result) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto">
          <Card className="p-8 text-center">
            <div className="text-5xl mb-4">{result.passed ? '🎉' : '😞'}</div>
            <h1 className="font-display font-bold text-2xl text-[#f0f4ff] mb-2">
              {result.passed ? 'Congratulations!' : 'Not quite there'}
            </h1>
            <div className="text-6xl font-display font-bold mb-2" style={{ color: result.passed ? '#10b981' : '#ef4444' }}>{pct}%</div>
            <Badge variant={result.passed ? 'green' : 'red'} className="mb-6">{result.passed ? 'Passed' : 'Failed'}</Badge>
            <div className="flex justify-center gap-8 text-sm text-[#6b7fa8] mb-6">
              <div><div className="text-xl font-bold text-[#f0f4ff]">{result.score}/{result.totalPoints}</div><div>Score</div></div>
              <div><div className="text-xl font-bold text-[#f0f4ff]">{quiz.passingScore}%</div><div>Passing</div></div>
            </div>
            <h2 className="font-semibold text-[#f0f4ff] mb-4 text-left">Answer Review</h2>
            <div className="space-y-3 text-left mb-6">
              {quiz.questions.map((q, i) => {
                const userAns = result.answers[i];
                const correct = userAns === q.correctIndex;
                return (
                  <div key={q.id} className={`p-3 rounded-lg border ${correct ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <p className="text-sm font-medium text-[#f0f4ff] mb-1">{i + 1}. {q.text}</p>
                    <p className="text-xs text-[#6b7fa8]">
                      Your answer: <span className={correct ? 'text-emerald-400' : 'text-red-400'}>{userAns >= 0 ? q.options[userAns] : 'Not answered'}</span>
                    </p>
                    {!correct && <p className="text-xs text-emerald-400">Correct: {q.options[q.correctIndex]}</p>}
                  </div>
                );
              })}
            </div>
            <Button onClick={() => navigate('student-quiz')}>Back to Quizzes</Button>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const q = quiz.questions[currentQ];
  const answered = answers.filter(a => a !== undefined && a !== -1).length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-display font-bold text-xl text-[#f0f4ff]">{quiz.title}</h1>
            <p className="text-sm text-[#6b7fa8]">Question {currentQ + 1} of {quiz.questions.length}</p>
          </div>
          <div className={`font-mono text-lg font-bold px-4 py-2 rounded-xl border ${timeLeft < 300 ? 'text-red-400 border-red-500/30 bg-red-500/5' : 'text-[#f0f4ff] border-[rgba(255,255,255,0.1)]'}`}>
            ⏱ {fmt(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-5">
          {quiz.questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)}
              className={`flex-1 h-1.5 rounded-full transition-colors ${i === currentQ ? 'bg-blue-500' : answers[i] !== undefined && answers[i] !== -1 ? 'bg-emerald-500' : 'bg-[#1a2540]'}`} />
          ))}
        </div>

        <Card className="p-6 mb-4">
          <h2 className="font-display font-bold text-lg text-[#f0f4ff] mb-6">{q.text}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(i)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${answers[currentQ] === i ? 'border-blue-500 bg-blue-500/10 text-[#f0f4ff]' : 'border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.16)] text-[#a0b4d0]'}`}>
                <span className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold shrink-0 ${answers[currentQ] === i ? 'border-blue-500 bg-blue-600 text-white' : 'border-[rgba(255,255,255,0.2)]'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="secondary" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>← Previous</Button>
          <span className="text-sm text-[#4a5a7a]">{answered}/{quiz.questions.length} answered</span>
          {currentQ < quiz.questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(q => q + 1)}>Next →</Button>
          ) : (
            <Button variant="success" onClick={finish}>Submit {quiz.isExam ? 'Exam' : 'Quiz'}</Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
