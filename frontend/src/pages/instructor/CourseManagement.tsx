import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, LevelBadge, Modal, Field, Input, Textarea, Select, SectionHeader, EmptyState, Avatar } from '../../components/UI';
import { CATEGORIES } from '../../data';
import type { Course } from '../../data';

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
  const [duration, setDuration] = useState('');
  const [thumbnail, setThumbnail] = useState('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop&auto=format');
  const [tags, setTags] = useState('');

  const handleCreate = () => {
    const course = createCourse({ title, description, category, level, duration, thumbnail, tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
    navigate('instructor-edit-course', { courseId: course.id });
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
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Python Bootcamp for Beginners" />
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
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duration">
                  <Input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 20 hours" />
                </Field>
                <Field label="Tags (comma-separated)">
                  <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="python, beginner, programming" />
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
                <div className="flex justify-between"><span className="text-[#6b7fa8]">Duration</span><span className="text-[#f0f4ff]">{duration || 'TBD'}</span></div>
              </div>
              <p className="text-sm text-[#6b7fa8]">{description}</p>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-sm text-blue-400">
                ℹ️ The course will be created as a draft. You can add modules and lessons before publishing.
              </div>
              <div className="flex justify-between">
                <Button variant="secondary" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleCreate}>Create Course →</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ── Edit Course ──────────────────────────────────────────────────────────────

export function EditCourse() {
  const { courses, addModule, addLesson, toggleCoursePublished, navigate, routeParams } = useApp();
  const course = courses.find(c => c.id === routeParams.courseId);
  const [addModModal, setAddModModal] = useState(false);
  const [addLesModal, setAddLesModal] = useState<string | null>(null);
  const [modTitle, setModTitle] = useState('');
  const [lesTitle, setLesTitle] = useState('');
  const [lesType, setLesType] = useState<'video' | 'document' | 'presentation'>('video');
  const [expandedMod, setExpandedMod] = useState<string | null>(null);

  if (!course) {
    return <DashboardLayout><EmptyState icon="😕" title="Course not found" action={<Button onClick={() => navigate('instructor-courses')}>Back</Button>} /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('instructor-courses')} className="text-[#6b7fa8] hover:text-white text-sm transition-colors">← Back</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-xl text-[#f0f4ff]">{course.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={course.isPublished ? 'green' : 'gray'}>{course.isPublished ? 'Published' : 'Draft'}</Badge>
            <Badge variant="purple">{course.category}</Badge>
          </div>
        </div>
        <Button size="sm" variant={course.isPublished ? 'secondary' : 'primary'} onClick={() => toggleCoursePublished(course.id)}>
          {course.isPublished ? 'Unpublish' : '🚀 Publish'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Course info summary */}
        <Card className="p-4">
          <img src={course.thumbnail} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7fa8]">Level</span><LevelBadge level={course.level} /></div>
            <div className="flex justify-between"><span className="text-[#6b7fa8]">Duration</span><span className="text-[#f0f4ff]">{course.duration}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7fa8]">Students</span><span className="text-[#f0f4ff]">{course.enrolledCount}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7fa8]">Modules</span><span className="text-[#f0f4ff]">{course.modules.length}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7fa8]">Lessons</span><span className="text-[#f0f4ff]">{course.modules.reduce((a, m) => a + m.lessons.length, 0)}</span></div>
          </div>
        </Card>

        {/* Curriculum builder */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-[#f0f4ff]">Curriculum</h2>
            <Button size="sm" onClick={() => setAddModModal(true)}>+ Add Module</Button>
          </div>

          {course.modules.length === 0 ? (
            <EmptyState icon="📂" title="No modules yet" description="Add modules to organize your course content"
              action={<Button size="sm" onClick={() => setAddModModal(true)}>Add First Module</Button>} />
          ) : (
            <div className="space-y-3">
              {course.modules.map((mod, mi) => (
                <Card key={mod.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setExpandedMod(expandedMod === mod.id ? null : mod.id)}
                      className="flex items-center gap-2 text-left flex-1">
                      <span className="text-[#4a5a7a]">{expandedMod === mod.id ? '▼' : '▶'}</span>
                      <span className="font-medium text-[#f0f4ff]">Module {mi + 1}: {mod.title}</span>
                      <span className="text-xs text-[#4a5a7a]">({mod.lessons.length} lessons)</span>
                    </button>
                    <Button size="xs" variant="ghost" onClick={() => setAddLesModal(mod.id)}>+ Lesson</Button>
                  </div>

                  {expandedMod === mod.id && (
                    <div className="space-y-2 pl-6">
                      {mod.lessons.map((l, li) => (
                        <div key={l.id} className="flex items-center gap-2 p-2 bg-[rgba(255,255,255,0.02)] rounded-lg text-sm">
                          <span className="text-[#4a5a7a] w-5">{li + 1}.</span>
                          <span>{l.type === 'video' ? '▶' : l.type === 'document' ? '📄' : '📊'}</span>
                          <span className="flex-1 text-[#a0b4d0]">{l.title}</span>
                          <span className="text-xs text-[#4a5a7a]">{l.duration}</span>
                          <Badge variant={l.type === 'video' ? 'blue' : l.type === 'document' ? 'green' : 'yellow'}>{l.type}</Badge>
                        </div>
                      ))}
                      {mod.lessons.length === 0 && (
                        <p className="text-xs text-[#4a5a7a] py-2">No lessons yet. Add a lesson to get started.</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Module Modal */}
      <Modal open={addModModal} onClose={() => setAddModModal(false)} title="Add Module">
        <Field label="Module Title" required>
          <Input value={modTitle} onChange={e => setModTitle(e.target.value)} placeholder="e.g. Introduction to Variables" />
        </Field>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setAddModModal(false)}>Cancel</Button>
          <Button onClick={() => { addModule(course.id, modTitle); setModTitle(''); setAddModModal(false); }} disabled={!modTitle.trim()}>
            Add Module
          </Button>
        </div>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal open={!!addLesModal} onClose={() => setAddLesModal(null)} title="Add Lesson">
        <div className="space-y-4">
          <Field label="Lesson Title" required>
            <Input value={lesTitle} onChange={e => setLesTitle(e.target.value)} placeholder="e.g. What are Variables?" />
          </Field>
          <Field label="Lesson Type" required>
            <Select value={lesType} onChange={e => setLesType(e.target.value as any)}>
              <option value="video">📹 Video</option>
              <option value="document">📄 Document</option>
              <option value="presentation">📊 Presentation</option>
            </Select>
          </Field>
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="secondary" onClick={() => setAddLesModal(null)}>Cancel</Button>
          <Button onClick={() => {
            if (addLesModal) { addLesson(addLesModal, course.id, lesTitle, lesType); setLesTitle(''); setAddLesModal(null); }
          }} disabled={!lesTitle.trim()}>Add Lesson</Button>
        </div>
      </Modal>
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
                {['Student', 'Course', 'Progress', 'Enrolled', 'Last Active'].map(h => (
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
                  <td className="px-4 py-3 text-[#6b7fa8]">{s.lastAccessed}</td>
                </tr>
              ))}
              {studentData.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#4a5a7a]">No students enrolled yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
