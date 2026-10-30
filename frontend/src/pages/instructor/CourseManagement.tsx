import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, LevelBadge, Modal, Field, Input, Textarea, Select, SectionHeader, EmptyState, Avatar, ConfirmDialog } from '../../components/UI';
import { CATEGORIES } from '../../lib/constants';
import type { Course } from '../../types';

// ── My Courses ──────────────────────────────────────────────────────────────

export function InstructorCourses() {
  const { currentUser, courses, toggleCoursePublished, navigate, getEnrollmentsForCourse } = useApp();
  if (!currentUser) return null;

  const myCourses = courses.filter(c => c.instructorId === currentUser.id);

  return (
    <DashboardLayout>
      <SectionHeader
        title="My Courses"
        description={`${myCourses.length} total courses`}
        action={<Button onClick={() => navigate('instructor-create-course')}>+ Create Course</Button>}
      />

      {myCourses.length === 0 ? (
        <EmptyState icon="📚" title="No courses yet" description="Create your first course to start teaching"
          action={<Button onClick={() => navigate('instructor-create-course')}>Create Course</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myCourses.map(course => {
            const enrollments = getEnrollmentsForCourse(course.id);
            const avgProgress = enrollments.length
              ? Math.round(enrollments.reduce((a, e) => a + e.progress, 0) / enrollments.length)
              : 0;
            return (
              <Card key={course.id} className="overflow-hidden">
                <div className="h-36 bg-[#1a2540] relative">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <Badge variant={course.isPublished ? 'green' : 'gray'}>{course.isPublished ? 'Published' : 'Draft'}</Badge>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="purple">{course.category}</Badge>
                    <LevelBadge level={course.level} />
                  </div>
                  <h3 className="font-display font-bold text-[#f0f4ff] mb-1 line-clamp-2">{course.title}</h3>
                  <div className="flex items-center justify-between text-xs text-[#6b7fa8] mb-3">
                    <span>👤 {enrollments.length} students</span>
                    <span>📈 {avgProgress}% avg</span>
                    <span>⏱ {course.duration}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="xs" variant="secondary" onClick={() => navigate('instructor-edit-course', { courseId: course.id })}>Edit</Button>
                    <Button size="xs" variant={course.isPublished ? 'ghost' : 'primary'} onClick={() => toggleCoursePublished(course.id)}>
                      {course.isPublished ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => navigate('instructor-students', { courseId: course.id })}>Students</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Create Course ──────────────────────────────────────────────────────────

export function CreateCourse() {
  const { createCourse, navigate } = useApp();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Programming');
  const [level, setLevel] = useState<Course['level']>('Beginner');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop&auto=format');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (saving) return;
    setSaving(true);
    const course = await createCourse({ title, description, category, level, thumbnail });
    setSaving(false);
    if (course) navigate('instructor-edit-course', { courseId: course.id });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <SectionHeader title="Create New Course" description="Fill in the details to create your course" />

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${step >= s ? 'bg-blue-600 border-blue-600 text-white' : 'border-[rgba(255,255,255,0.2)] text-[#4a5a7a]'}`}>{s}</div>
              {s < 3 && <div className={`h-0.5 w-16 ${step > s ? 'bg-blue-600' : 'bg-[rgba(255,255,255,0.1)]'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-[#6b7fa8]">{step === 1 ? 'Basic Info' : step === 2 ? 'Media' : 'Review'}</span>
        </div>

        <Card className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-[#f0f4ff]">Course Information</h2>
              <Field label="Course Title" required>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to Database Systems" />
              </Field>
              <Field label="Description" required>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                  placeholder="Describe what students will learn in this course..." />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category" required>
                  <Select value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Level" required>
                  <Select value={level} onChange={e => setLevel(e.target.value as Course['level'])}>
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)} disabled={!title.trim() || !description.trim()}>Next →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-[#f0f4ff]">Course Thumbnail</h2>
              <Field label="Thumbnail URL" hint="Use a high-quality image (600x340px recommended)">
                <Input value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://images.unsplash.com/..." />
              </Field>
              {thumbnail && (
                <div className="rounded-xl overflow-hidden h-48">
                  <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="text-sm text-[#6b7fa8]">💡 Tip: Use Unsplash images for professional-looking thumbnails</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=340&fit=crop&auto=format',
                  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop&auto=format',
                  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop&auto=format',
                ].map(url => (
                  <button key={url} onClick={() => setThumbnail(url)} className={`rounded-lg overflow-hidden h-20 border-2 transition-colors ${thumbnail === url ? 'border-blue-500' : 'border-transparent'}`}>
                    <img src={url} alt="Preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={() => setStep(3)}>Next →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg text-[#f0f4ff]">Review & Create</h2>
              <div className="rounded-xl overflow-hidden h-40">
                <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6b7fa8]">Title</span><span className="text-[#f0f4ff] font-medium">{title}</span></div>
                <div className="flex justify-between"><span className="text-[#6b7fa8]">Category</span><Badge variant="purple">{category}</Badge></div>
                <div className="flex justify-between"><span className="text-[#6b7fa8]">Level</span><LevelBadge level={level} /></div>
              </div>
              <p className="text-sm text-[#6b7fa8]">{description}</p>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-400">
                ℹ️ The course will be created as a draft. You can add modules and lessons before publishing. Duration is calculated from your lessons.
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? 'Creating…' : 'Create Course →'}</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ── Edit Course ──────────────────────────────────────────────────────────────

type LessonType = 'video' | 'document' | 'presentation';
interface LessonForm { id: string | null; moduleId: string; title: string; type: LessonType; content: string; minutes: string }
const emptyLesson = (moduleId: string): LessonForm => ({ id: null, moduleId, title: '', type: 'video', content: '', minutes: '10' });
const fmtSize = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export function EditCourse() {
  const {
    courses, materials, addModule, renameModule, deleteModule, addLesson, updateLesson, deleteLesson, updateCourse, deleteCourse,
    toggleCoursePublished, loadMaterials, uploadMaterial, deleteMaterial, createAssignment, getAssignmentsForCourse, navigate, routeParams,
  } = useApp();
  const course = courses.find(c => c.id === routeParams.courseId);
  const courseId = course?.id;

  const [modForm, setModForm] = useState<{ id: string | null; title: string } | null>(null);
  const [lesForm, setLesForm] = useState<LessonForm | null>(null);
  const [expandedMod, setExpandedMod] = useState<string | null>(null);
  const [infoForm, setInfoForm] = useState<{ title: string; description: string; category: string; level: Course['level']; thumbnail: string } | null>(null);
  const [asgForm, setAsgForm] = useState<{ title: string; description: string; dueDate: string; maxPoints: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'course' | 'module' | 'lesson' | 'material'; id: string; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (courseId) loadMaterials(courseId); }, [courseId, loadMaterials]);

  if (!course) {
    return <DashboardLayout><EmptyState icon="😕" title="Course not found" action={<Button onClick={() => navigate('instructor-courses')}>Back</Button>} /></DashboardLayout>;
  }

  const files = materials[course.id] || [];
  const assignments = getAssignmentsForCourse(course.id);

  const saveInfo = async () => {
    if (!infoForm || busy) return;
    setBusy(true);
    const ok = await updateCourse(course.id, infoForm);
    setBusy(false);
    if (ok) setInfoForm(null);
  };
  const saveModule = async () => {
    if (!modForm || !modForm.title.trim()) return;
    if (modForm.id) await renameModule(modForm.id, modForm.title.trim()); else await addModule(course.id, modForm.title.trim());
    setModForm(null);
  };
  const saveLesson = async () => {
    if (!lesForm || !lesForm.title.trim() || busy) return;
    setBusy(true);
    const minutes = Math.max(0, parseInt(lesForm.minutes) || 0);
    if (lesForm.id) await updateLesson(lesForm.id, { title: lesForm.title.trim(), type: lesForm.type, content: lesForm.content, durationMinutes: minutes });
    else await addLesson(lesForm.moduleId, course.id, lesForm.title.trim(), lesForm.type, lesForm.content, minutes);
    setBusy(false);
    setLesForm(null);
  };
  const saveAssignment = async () => {
    if (!asgForm || busy) return;
    setBusy(true);
    const ok = await createAssignment(course.id, { title: asgForm.title.trim(), description: asgForm.description.trim(), dueDate: new Date(asgForm.dueDate + 'T23:59:00').toISOString(), maxPoints: parseInt(asgForm.maxPoints) || 100 });
    setBusy(false);
    if (ok) setAsgForm(null);
  };
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await uploadMaterial(course.id, f);
  };
  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, id } = confirm;
    if (kind === 'course') { if (await deleteCourse(id)) navigate('instructor-courses'); }
    else if (kind === 'module') await deleteModule(id);
    else if (kind === 'lesson') await deleteLesson(id);
    else await deleteMaterial(course.id, id);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button onClick={() => navigate('instructor-courses')} className="text-[#6b7fa8] hover:text-white text-sm transition-colors">← Back</button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-xl text-[#f0f4ff]">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={course.isPublished ? 'green' : 'gray'}>{course.isPublished ? 'Published' : 'Draft'}</Badge>
            <Badge variant="purple">{course.category}</Badge>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setInfoForm({ title: course.title, description: course.description, category: course.category, level: course.level, thumbnail: course.thumbnail })}>Edit details</Button>
        <Button size="sm" variant={course.isPublished ? 'secondary' : 'primary'} onClick={() => toggleCoursePublished(course.id)}>
          {course.isPublished ? 'Unpublish' : '🚀 Publish'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm({ kind: 'course', id: course.id, label: course.title })}>Delete</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-5">
          <Card className="p-4">
            <img src={course.thumbnail} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />
            <p className="text-sm text-[#a0b4d0] mb-3">{course.description}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[#6b7fa8]">Level</span><LevelBadge level={course.level} /></div>
              <div className="flex justify-between"><span className="text-[#6b7fa8]">Duration</span><span className="text-[#f0f4ff]">{course.duration}</span></div>
              <div className="flex justify-between"><span className="text-[#6b7fa8]">Students</span><span className="text-[#f0f4ff]">{course.enrolledCount}</span></div>
              <div className="flex justify-between"><span className="text-[#6b7fa8]">Modules</span><span className="text-[#f0f4ff]">{course.modules.length}</span></div>
              <div className="flex justify-between"><span className="text-[#6b7fa8]">Lessons</span><span className="text-[#f0f4ff]">{course.modules.reduce((a, m) => a + m.lessons.length, 0)}</span></div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-[#f0f4ff]">Course files</h2>
              <Button size="xs" onClick={() => fileRef.current?.click()}>+ Upload</Button>
              <input ref={fileRef} type="file" className="hidden" onChange={onPick} aria-label="Upload course file" data-testid="material-input" />
            </div>
            {files.length === 0 ? <p className="text-xs text-[#4a5a7a]">No files yet. Max 10 MB each.</p> : (
              <ul className="space-y-2">
                {files.map(m => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <a href={`/api/materials/${m.id}/download`} className="flex-1 truncate text-blue-400 hover:underline">📎 {m.fileName}</a>
                    <span className="text-xs text-[#4a5a7a]">{fmtSize(m.sizeBytes)}</span>
                    <button onClick={() => setConfirm({ kind: 'material', id: m.id, label: m.fileName })} className="text-red-400 hover:text-red-300 text-xs" aria-label={`Remove ${m.fileName}`}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-[#f0f4ff]">Curriculum</h2>
              <Button size="sm" onClick={() => setModForm({ id: null, title: '' })}>+ Add Module</Button>
            </div>

            {course.modules.length === 0 ? (
              <EmptyState icon="📂" title="No modules yet" description="Add modules to organize your course content"
                action={<Button size="sm" onClick={() => setModForm({ id: null, title: '' })}>Add First Module</Button>} />
            ) : (
              <div className="space-y-3">
                {course.modules.map((mod, mi) => (
                  <Card key={mod.id} className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <button onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                        <span className="text-[#4a5a7a]">{expandedMod === mod.id ? '▼' : '▶'}</span>
                        <span className="font-medium text-[#f0f4ff]">Module {mi + 1}: {mod.title}</span>
                        <span className="text-xs text-[#4a5a7a]">({mod.lessons.length} lessons)</span>
                      </button>
                      <Button size="xs" variant="ghost" onClick={() => { setExpandedMod(mod.id); setLesForm(emptyLesson(mod.id)); }}>+ Lesson</Button>
                      <Button size="xs" variant="ghost" onClick={() => setModForm({ id: mod.id, title: mod.title })}>Rename</Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirm({ kind: 'module', id: mod.id, label: mod.title })}>Delete</Button>
                    </div>

                    {expandedMod === mod.id && (
                      <div className="space-y-2 pl-6 mt-3">
                        {mod.lessons.map((l, li) => (
                          <div key={l.id} className="flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg text-sm">
                            <span className="text-[#4a5a7a] w-5">{li + 1}.</span>
                            <span>{l.type === 'video' ? '▶' : l.type === 'document' ? '📄' : '📊'}</span>
                            <span className="flex-1 text-[#a0b4d0]">{l.title}</span>
                            <span className="text-xs text-[#4a5a7a]">{l.duration}</span>
                            <Badge variant={l.type === 'video' ? 'blue' : l.type === 'document' ? 'green' : 'yellow'}>{l.type}</Badge>
                            <button onClick={() => setLesForm({ id: l.id, moduleId: mod.id, title: l.title, type: l.type as LessonType, content: l.content, minutes: String(l.durationMinutes) })} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                            <button onClick={() => setConfirm({ kind: 'lesson', id: l.id, label: l.title })} className="text-red-400 hover:text-red-300 text-xs" aria-label={`Delete ${l.title}`}>✕</button>
                          </div>
                        ))}
                        {mod.lessons.length === 0 && <p className="text-xs text-[#4a5a7a] py-2">No lessons yet. Add a lesson to get started.</p>}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-[#f0f4ff]">Assignments</h2>
              <Button size="sm" onClick={() => setAsgForm({ title: '', description: '', dueDate: '', maxPoints: '100' })}>+ New Assignment</Button>
            </div>
            {assignments.length === 0 ? <p className="text-sm text-[#4a5a7a]">No assignments for this course yet.</p> : (
              <div className="space-y-2">
                {assignments.map(a => (
                  <Card key={a.id} className="p-3 flex items-center gap-3 text-sm">
                    <span className="flex-1 text-[#f0f4ff]">{a.title}</span>
                    <span className="text-xs text-[#6b7fa8]">Due {new Date(a.dueDate).toLocaleDateString()}</span>
                    <Badge variant="blue">{a.maxPoints} pts</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course details */}
      <Modal open={!!infoForm} onClose={() => setInfoForm(null)} title="Edit course details" size="lg">
        {infoForm && (
          <div className="space-y-4">
            <Field label="Title" required><Input value={infoForm.title} onChange={e => setInfoForm({ ...infoForm, title: e.target.value })} /></Field>
            <Field label="Description" required><Textarea rows={4} value={infoForm.description} onChange={e => setInfoForm({ ...infoForm, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category"><Select value={infoForm.category} onChange={e => setInfoForm({ ...infoForm, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</Select></Field>
              <Field label="Level"><Select value={infoForm.level} onChange={e => setInfoForm({ ...infoForm, level: e.target.value as Course['level'] })}>
                <option>Beginner</option><option>Intermediate</option><option>Advanced</option></Select></Field>
            </div>
            <Field label="Thumbnail URL"><Input value={infoForm.thumbnail} onChange={e => setInfoForm({ ...infoForm, thumbnail: e.target.value })} /></Field>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setInfoForm(null)}>Cancel</Button>
              <Button onClick={saveInfo} disabled={!infoForm.title.trim() || !infoForm.description.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Module add / rename */}
      <Modal open={!!modForm} onClose={() => setModForm(null)} title={modForm?.id ? 'Rename module' : 'Add Module'}>
        <Field label="Module Title" required>
          <Input value={modForm?.title || ''} onChange={e => setModForm(f => f && { ...f, title: e.target.value })} placeholder="e.g. Introduction to Variables" />
        </Field>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setModForm(null)}>Cancel</Button>
          <Button onClick={saveModule} disabled={!modForm?.title.trim()}>{modForm?.id ? 'Save' : 'Add Module'}</Button>
        </div>
      </Modal>

      {/* Lesson add / edit */}
      <Modal open={!!lesForm} onClose={() => setLesForm(null)} title={lesForm?.id ? 'Edit lesson' : 'Add Lesson'} size="lg">
        {lesForm && (
          <div className="space-y-4">
            <Field label="Lesson Title" required><Input value={lesForm.title} onChange={e => setLesForm({ ...lesForm, title: e.target.value })} placeholder="e.g. What are Variables?" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Lesson Type" required>
                <Select value={lesForm.type} onChange={e => setLesForm({ ...lesForm, type: e.target.value as LessonType })}>
                  <option value="video">📹 Video</option><option value="document">📄 Document</option><option value="presentation">📊 Presentation</option>
                </Select>
              </Field>
              <Field label="Duration (minutes)"><Input type="number" min={0} value={lesForm.minutes} onChange={e => setLesForm({ ...lesForm, minutes: e.target.value })} /></Field>
            </div>
            <Field label="Lesson content" hint="Text students will read, or a video link. Attach files under Course files.">
              <Textarea rows={6} value={lesForm.content} onChange={e => setLesForm({ ...lesForm, content: e.target.value })} placeholder="Write the lesson notes here…" />
            </Field>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setLesForm(null)}>Cancel</Button>
              <Button onClick={saveLesson} disabled={!lesForm.title.trim() || busy}>{busy ? 'Saving…' : lesForm.id ? 'Save lesson' : 'Add Lesson'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* New assignment */}
      <Modal open={!!asgForm} onClose={() => setAsgForm(null)} title="New assignment" size="lg">
        {asgForm && (
          <div className="space-y-4">
            <Field label="Title" required><Input value={asgForm.title} onChange={e => setAsgForm({ ...asgForm, title: e.target.value })} /></Field>
            <Field label="Instructions" required><Textarea rows={4} value={asgForm.description} onChange={e => setAsgForm({ ...asgForm, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Due date" required><Input type="date" value={asgForm.dueDate} onChange={e => setAsgForm({ ...asgForm, dueDate: e.target.value })} /></Field>
              <Field label="Maximum points"><Input type="number" min={1} value={asgForm.maxPoints} onChange={e => setAsgForm({ ...asgForm, maxPoints: e.target.value })} /></Field>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setAsgForm(null)}>Cancel</Button>
              <Button onClick={saveAssignment} disabled={!asgForm.title.trim() || !asgForm.description.trim() || !asgForm.dueDate || busy}>{busy ? 'Saving…' : 'Create assignment'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={runConfirm} confirmLabel="Delete"
        title={`Delete ${confirm?.kind}?`}
        message={confirm?.kind === 'course' ? `"${confirm.label}" and all of its lessons, assignments, quizzes, discussions and enrolments will be permanently removed.`
          : confirm?.kind === 'module' ? `"${confirm?.label}" and its lessons will be removed.` : `"${confirm?.label}" will be removed.`} />
    </DashboardLayout>
  );
}

// ── Student Management ──────────────────────────────────────────────────────

export function StudentManagement() {
  const { currentUser, courses, enrollments, routeParams, getUserById } = useApp();
  if (!currentUser) return null;

  const myCourses = courses.filter(c => c.instructorId === currentUser.id);
  const [courseFilter, setCourseFilter] = useState(routeParams.courseId || '');
  const filteredCourses = courseFilter ? myCourses.filter(c => c.id === courseFilter) : myCourses;

  const studentData = filteredCourses.flatMap(course =>
    enrollments.filter(e => e.courseId === course.id).map(e => {
      const student = getUserById(e.studentId);
      return { ...e, student, courseName: course.title };
    })
  ).filter(x => x.student);

  return (
    <DashboardLayout>
      <SectionHeader title="Student Management" description={`${studentData.length} enrolled students`} />
      <Card>
        <div className="p-4 border-b border-[rgba(255,255,255,0.07)]">
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
            <option value="">All Courses</option>
            {myCourses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Student', 'Course', 'Progress', 'Enrolled'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studentData.map((s, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar src={s.student!.avatar} name={s.student!.name} size={28} />
                      <span className="text-[#f0f4ff]">{s.student!.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6b7fa8]">{s.courseName}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-[#1a2540] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.progress}%` }} />
                      </div>
                      <span className="text-xs text-[#6b7fa8]">{s.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6b7fa8]">{s.enrolledAt}</td>
                </tr>
              ))}
              {studentData.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#4a5a7a]">No students enrolled yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
