import { useState, useEffect } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, ProgressBar, LevelBadge, Tabs, EmptyState, SectionHeader } from '../../components/UI';
import { type Lesson } from '../../types';

// ── My Courses ──────────────────────────────────────────────────────────

export function MyCourses() {
  const { currentUser, enrollments, navigate, getCourseById, getUserById, dataReady } = useApp();
  const [tab, setTab] = useState('all');
  if (!currentUser) return null;
  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;
  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const myCourses = myEnrollments.map(e => ({ enrollment: e, course: getCourseById(e.courseId)! })).filter(x => x.course);

  const filtered = myCourses.filter(({ enrollment }) => {
    if (tab === 'in-progress') return enrollment.progress > 0 && enrollment.progress < 100;
    if (tab === 'completed') return enrollment.progress === 100;
    if (tab === 'not-started') return enrollment.progress === 0;
    return true;
  });

  return (
    <DashboardLayout>
      <SectionHeader
        title="My Courses"
        description={`${myEnrollments.length} enrolled courses`}
        action={<Button size="sm" variant="outline" onClick={() => navigate('courses')}>Browse More</Button>}
      />

      <div className="mb-5">
        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: myCourses.length },
            { id: 'in-progress', label: 'In Progress', count: myCourses.filter(x => x.enrollment.progress > 0 && x.enrollment.progress < 100).length },
            { id: 'completed', label: 'Completed', count: myCourses.filter(x => x.enrollment.progress === 100).length },
            { id: 'not-started', label: 'Not Started', count: myCourses.filter(x => x.enrollment.progress === 0).length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="📚" title="No courses found" description="Start learning by browsing available courses."
          action={<Button onClick={() => navigate('courses')}>Browse Courses</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(({ enrollment, course }) => {
            const instructor = getUserById(course.instructorId);
            return (
              <Card key={enrollment.id} className="overflow-hidden">
                <div className="h-36 bg-[#1a2540] relative">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/70 to-transparent" />
                  <div className="absolute bottom-3 left-3"><LevelBadge level={course.level} /></div>
                  {enrollment.progress === 100 && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">✓ Complete</div>
                  )}
                </div>
                <div className="p-4">
                  <Badge variant="purple" className="mb-2">{course.category}</Badge>
                  <h3 className="font-display font-bold text-[#f0f4ff] mb-1 line-clamp-2">{course.title}</h3>
                  <p className="text-xs text-[#6b7fa8] mb-3">{instructor?.name || course.instructorName}</p>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-[#6b7fa8] mb-1">
                      <span>Progress</span><span>{enrollment.progress}%</span>
                    </div>
                    <ProgressBar value={enrollment.progress} color={enrollment.progress === 100 ? 'green' : 'blue'} />
                  </div>
                  <Button className="w-full justify-center" size="sm" onClick={() => navigate('student-learn', { courseId: course.id })}>
                    {enrollment.progress === 0 ? 'Start Course' : enrollment.progress === 100 ? 'Review Course' : 'Continue Learning'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Course Viewer ──────────────────────────────────────────────────────────

export function CourseLearn() {
  const { currentUser, enrollments, markLessonComplete, routeParams, navigate, getCourseById, dataReady, materials, loadMaterials } = useApp();
  const courseId = routeParams.courseId;
  const course = getCourseById(courseId);

  const [pickedId, setPickedId] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const enrolled = !!currentUser && enrollments.some(e => e.studentId === currentUser.id && e.courseId === courseId);
  useEffect(() => { if (enrolled) void loadMaterials(courseId); }, [enrolled, courseId, loadMaterials]);

  const allLessons: Lesson[] = course ? course.modules.flatMap(m => m.lessons) : [];
  const activeLesson: Lesson | null = allLessons.find(l => l.id === pickedId) || allLessons[0] || null;
  const setActiveLesson = (l: Lesson) => setPickedId(l.id);

  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;

  if (!currentUser || !course) {
    return (
      <DashboardLayout>
        <EmptyState icon="😕" title="Course not found" description="The course you're looking for doesn't exist."
          action={<Button onClick={() => navigate('student-my-courses')}>My Courses</Button>} />
      </DashboardLayout>
    );
  }

  const enrollment = enrollments.find(e => e.studentId === currentUser.id && e.courseId === courseId);
  if (!enrollment) {
    return (
      <DashboardLayout>
        <EmptyState icon="🔒" title="Not enrolled" description="You need to enroll in this course first."
          action={<Button onClick={() => navigate('course-detail', { courseId })}>View Course</Button>} />
      </DashboardLayout>
    );
  }

  const toggleModule = (id: string) => setExpandedModules(prev => {
    const next = new Set(prev.size === 0 && course.modules[0] ? [course.modules[0].id] : prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const isCompleted = (lessonId: string) => enrollment.completedLessons.includes(lessonId);
  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('student-my-courses')} className="text-[#6b7fa8] hover:text-white text-sm transition-colors">← Back</button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-xl text-[#f0f4ff]">{course.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="text-xs text-[#6b7fa8]">{enrollment.completedLessons.length}/{totalLessons} lessons</div>
            <div className="flex-1 max-w-48"><ProgressBar value={enrollment.progress} /></div>
            <div className="text-xs text-[#6b7fa8]">{enrollment.progress}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {course.modules.map(mod => (
            <div key={mod.id}>
              <button onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between p-3 bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm font-medium text-[#f0f4ff] hover:border-[rgba(255,255,255,0.14)] transition-all">
                <span className="text-left truncate">{mod.title}</span>
                <span className="text-[#4a5a7a] shrink-0 ml-2">{(expandedModules.has(mod.id) || (expandedModules.size === 0 && mod.id === course.modules[0]?.id)) ? '▼' : '▶'}</span>
              </button>
              {(expandedModules.has(mod.id) || (expandedModules.size === 0 && mod.id === course.modules[0]?.id)) && (
                <div className="ml-3 mt-1 space-y-1 border-l border-[rgba(255,255,255,0.07)] pl-3">
                  {mod.lessons.map(lesson => (
                    <button key={lesson.id} onClick={() => setActiveLesson(lesson)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all ${activeLesson?.id === lesson.id ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20' : 'text-[#6b7fa8] hover:text-[#f0f4ff]'}`}>
                      <span className="shrink-0">{isCompleted(lesson.id) ? '✅' : lesson.type === 'video' ? '▶' : '📄'}</span>
                      <span className="truncate">{lesson.title}</span>
                      <span className="ml-auto shrink-0 text-[#4a5a7a]">{lesson.duration}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeLesson ? (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-bold text-xl text-[#f0f4ff]">{activeLesson.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={activeLesson.type === 'video' ? 'blue' : activeLesson.type === 'document' ? 'green' : 'yellow'}>
                      {activeLesson.type}
                    </Badge>
                    <span className="text-xs text-[#4a5a7a]">{activeLesson.duration}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isCompleted(activeLesson.id) ? 'success' : 'primary'}
                  onClick={() => !isCompleted(activeLesson.id) && markLessonComplete(courseId, activeLesson.id)}
                >
                  {isCompleted(activeLesson.id) ? '✓ Completed' : 'Mark Complete'}
                </Button>
              </div>

              {activeLesson.type === 'video' && /^https?:\/\//.test(activeLesson.content) ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
                  <iframe
                    src={activeLesson.content}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={activeLesson.title}
                  />
                </div>
              ) : (
                <div className="bg-[#0b1120] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 mb-4 min-h-48">
                  <div className="text-[#a0b4d0] leading-relaxed"><span className="whitespace-pre-wrap">{activeLesson.content || 'No written content for this lesson yet. See the course materials below.'}</span></div>
                </div>
              )}

              {(materials[courseId] || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#6b7fa8] mb-3">Course Materials</h3>
                  <div className="flex flex-wrap gap-2">
                    {(materials[courseId] || []).map(m => (
                      <a key={m.id} href={`/api/materials/${m.id}/download`}
                        className="flex items-center gap-2 px-3 py-2 bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#a0b4d0] transition-colors">
                        📎 {m.fileName} <span className="text-xs text-[#4a5a7a]">{(m.sizeBytes / 1024).toFixed(0)} KB</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <EmptyState icon="👆" title="Select a lesson" description="Choose a lesson from the sidebar to start learning" />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
