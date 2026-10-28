import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Field, Input, Textarea, Select, Modal, SectionHeader, EmptyState } from '../../components/UI';
import { type Question } from '../../data';

export default function QuizBuilder() {
  const { currentUser, courses, quizzes, createQuiz } = useApp();
  if (!currentUser) return null;

  const myCourses = courses.filter(c => c.instructorId === currentUser.id);
  const myQuizzes = quizzes.filter(q => q.instructorId === currentUser.id).map(q => ({
    ...q, course: courses.find(c => c.id === q.courseId),
  }));

  const [createModal, setCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [duration, setDuration] = useState('20');
  const [passingScore, setPassingScore] = useState('70');
  const [isExam, setIsExam] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState<Partial<Question>>({ options: ['', '', '', ''], correctIndex: 0, points: 10 });

  const addQuestion = () => {
    if (!currentQ.text || !currentQ.options?.every(o => o)) return;
    const q: Question = {
      id: `qq${Date.now()}`,
      quizId: '',
      text: currentQ.text!,
      options: currentQ.options!,
      correctIndex: currentQ.correctIndex ?? 0,
      points: currentQ.points || 10,
    };
    setQuestions(prev => [...prev, q]);
    setCurrentQ({ options: ['', '', '', ''], correctIndex: 0, points: 10 });
  };

  const handleCreate = () => {
    createQuiz({
      title, description, courseId, duration: parseInt(duration), passingScore: parseInt(passingScore), isExam, questions,
      availableFrom: new Date().toISOString().split('T')[0], availableUntil: '',
    });
    setCreateModal(false);
    setTitle(''); setDescription(''); setCourseId(''); setQuestions([]);
  };

  return (
    <DashboardLayout>
      <SectionHeader
        title="Quiz Builder"
        description={`${myQuizzes.length} quizzes and exams created`}
        action={<Button onClick={() => setCreateModal(true)}>+ Create Quiz</Button>}
      />

      {myQuizzes.length === 0 ? (
        <EmptyState icon="❓" title="No quizzes yet" description="Create your first quiz to assess student knowledge"
          action={<Button onClick={() => setCreateModal(true)}>Create Quiz</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myQuizzes.map(q => (
            <Card key={q.id} className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display font-bold text-[#f0f4ff] flex-1">{q.title}</h3>
                {q.isExam && <Badge variant="red">Exam</Badge>}
              </div>
              <p className="text-xs text-blue-400 mb-3">{q.course?.title}</p>
              <p className="text-sm text-[#a0b4d0] mb-4 line-clamp-2">{q.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-[#6b7fa8] mb-4">
                <span>⏱ {q.duration} min</span>
                <span>❓ {q.questions.length} questions</span>
                <span>🎯 Pass: {q.passingScore}%</span>
                <span>📅 {q.createdAt}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create Quiz / Exam" size="xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Quiz settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#f0f4ff]">Quiz Settings</h3>
            <Field label="Title" required>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Quiz title..." />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description..." />
            </Field>
            <Field label="Course" required>
              <Select value={courseId} onChange={e => setCourseId(e.target.value)}>
                <option value="">Select course...</option>
                {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Duration (min)">
                <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={5} />
              </Field>
              <Field label="Passing Score (%)">
                <Input type="number" value={passingScore} onChange={e => setPassingScore(e.target.value)} min={0} max={100} />
              </Field>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-10 h-5 rounded-full transition-colors ${isExam ? 'bg-blue-600' : 'bg-[#1a2540]'}`} onClick={() => setIsExam(e => !e)}>
                <span className={`block w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${isExam ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-[#a0b4d0]">This is an exam (more formal)</span>
            </label>

            {/* Questions list */}
            <div>
              <h4 className="text-sm font-medium text-[#f0f4ff] mb-2">Questions ({questions.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg text-sm">
                    <span className="text-[#4a5a7a] w-5">{i + 1}.</span>
                    <span className="flex-1 text-[#a0b4d0] truncate">{q.text}</span>
                    <span className="text-xs text-[#4a5a7a]">{q.points}pts</span>
                    <button onClick={() => setQuestions(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                ))}
                {questions.length === 0 && <p className="text-xs text-[#4a5a7a] text-center py-2">Add questions using the form →</p>}
              </div>
            </div>
          </div>

          {/* Right: Question builder */}
          <div className="space-y-4">
            <h3 className="font-semibold text-[#f0f4ff]">Add Question</h3>
            <Field label="Question Text" required>
              <Textarea value={currentQ.text || ''} onChange={e => setCurrentQ(q => ({ ...q, text: e.target.value }))} rows={3}
                placeholder="Type your question here..." />
            </Field>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#a0b4d0]">Answer Options (select correct answer)</label>
              {currentQ.options?.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" checked={currentQ.correctIndex === i} onChange={() => setCurrentQ(q => ({ ...q, correctIndex: i }))}
                    className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-[#6b7fa8] w-5">{String.fromCharCode(65 + i)}.</span>
                  <Input value={opt} onChange={e => setCurrentQ(q => {
                    const options = [...(q.options || [])]; options[i] = e.target.value; return { ...q, options };
                  })} placeholder={`Option ${String.fromCharCode(65 + i)}`} />
                </div>
              ))}
            </div>
            <Field label="Points">
              <Input type="number" value={currentQ.points || 10} onChange={e => setCurrentQ(q => ({ ...q, points: parseInt(e.target.value) || 10 }))} min={1} />
            </Field>
            <Button size="sm" variant="secondary" onClick={addQuestion}
              disabled={!currentQ.text || !currentQ.options?.every(o => o)}>
              + Add Question
            </Button>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[rgba(255,255,255,0.07)]">
          <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title || !courseId || questions.length === 0}>
            Create {isExam ? 'Exam' : 'Quiz'} ({questions.length} questions)
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
