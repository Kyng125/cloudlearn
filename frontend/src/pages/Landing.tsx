import { useEffect, useState } from 'react';
import { useApp } from '../context';
import { api, errorMessage } from '../api';
import type { Course } from '../types';
import { PublicLayout } from '../components/Layout';
import { Button, Card, Badge, LevelBadge } from '../components/UI';
import { CATEGORIES } from '../lib/constants';

// Published courses: from the signed-in user's data, or the public catalogue when signed out.
function usePublishedCourses(): { courses: Course[]; loading: boolean; error: string } {
  const { currentUser, courses } = useApp();
  const [pub, setPub] = useState<Course[]>([]);
  const [loading, setLoading] = useState(!currentUser);
  const [error, setError] = useState('');
  useEffect(() => {
    if (currentUser) { setLoading(false); return; }
    let live = true;
    setLoading(true); setError('');
    api.get('/public/courses').then(r => { if (live) setPub((r.courses as any[]).map(c => ({ ...c, duration: `${Math.round((c.durationMinutes || 0) / 60 * 10) / 10} h`, modules: [] }))); })
      .catch(e => { if (live) setError(errorMessage(e)); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [currentUser]);
  return { courses: currentUser ? courses.filter(c => c.isPublished) : pub, loading, error };
}

function CourseGridState({ loading, error, empty }: { loading: boolean; error: string; empty: boolean }) {
  if (loading) return <p className="text-sm text-[#6b7fa8]">Loading courses…</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (empty) return <p className="text-sm text-[#6b7fa8]">No published courses yet.</p>;
  return null;
}

const FEATURES = [
  { icon: '🎓', title: 'Role-Based Workspaces', desc: 'Separate dashboards and permissions for students, instructors and administrators.' },
  { icon: '📱', title: 'Desktop and Mobile', desc: 'Course materials, assignments and assessments are reachable from any modern browser, on or off campus.' },
  { icon: '⚡', title: 'Quizzes and Exams', desc: 'Timed multiple-choice assessments with automatic scoring and answer review.' },
  { icon: '📊', title: 'Progress Tracking', desc: 'Lesson completion, grades and quiz results are tracked per student and per course.' },
  { icon: '💬', title: 'Forums and Messaging', desc: 'Course discussion forums and direct messages keep teaching going between scheduled contact hours.' },
  { icon: '☁️', title: 'Built for the Cloud', desc: 'Designed for cloud deployment so capacity does not depend on a campus server room.' },
];

export function Landing() {
  const { navigate } = useApp();
  const { courses: published, loading, error } = usePublishedCourses();
  const STATS = [
    { label: 'Published Courses', value: loading ? '…' : String(published.length) },
    { label: 'Course Categories', value: String(CATEGORIES.length) },
    { label: 'Instructors', value: loading ? '…' : String(new Set(published.map(c => c.instructorId)).size) },
    { label: 'Enrolments', value: loading ? '…' : String(published.reduce((a, c) => a + c.enrolledCount, 0)) },
  ];
  const featuredCourses = published.slice(0, 6);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/10 pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <Badge variant="cyan" className="mb-6">🚀 Cloud-Based Learning Platform</Badge>
          <h1 className="font-display font-bold text-5xl md:text-7xl text-[#f0f4ff] mb-6 leading-[1.05]">
            Your HND Computer Science <span className="text-gradient">Classroom, Online</span>
          </h1>
          <p className="text-lg md:text-xl text-[#6b7fa8] max-w-2xl mx-auto mb-10 leading-relaxed">
            CloudLearn is a cloud-based e-learning platform for hybrid learning, built for the Department of Computer Science, Yaba College of Technology. Course materials, assignments, timed quizzes and discussion for HND students, on campus or off.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('register')}>Get Started →</Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('courses')}>Browse Courses</Button>
          </div>

          <div className="mt-10 p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl inline-flex flex-col items-start gap-2 text-left mx-auto">
            <p className="text-xs text-[#4a5a7a] uppercase tracking-wider font-mono mb-1">Quick Demo Login</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '🎓 Student', email: 'student@cloudlearn.com' },
                { label: '👨‍🏫 Instructor', email: 'instructor@cloudlearn.com' },
                { label: '⚙️ Admin', email: 'admin@cloudlearn.com' },
              ].map(d => (
                <button key={d.email} onClick={() => navigate('login')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#a0b4d0] transition-colors">
                  {d.label} <span className="font-mono text-xs text-[#4a5a7a]">{d.email}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-[#4a5a7a]">Password: <span className="font-mono">demo123</span></p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 border-y border-[rgba(255,255,255,0.07)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display font-bold text-3xl text-[#f0f4ff] mb-1">{s.value}</div>
              <div className="text-sm text-[#6b7fa8]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="blue" className="mb-4">Platform Features</Badge>
            <h2 className="font-display font-bold text-4xl text-[#f0f4ff] mb-4">Everything you need to learn effectively</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <Card key={f.title} className="p-5">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-display font-bold text-[#f0f4ff] mb-2">{f.title}</h3>
                <p className="text-sm text-[#6b7fa8] leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-6 bg-[#0d1628]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display font-bold text-2xl text-[#f0f4ff] mb-6">Browse by Category</h2>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => navigate('courses')}
                className="flex items-center gap-2 px-4 py-2 bg-[#111827] hover:bg-[#1a2540] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-[#a0b4d0] transition-colors">
                {cat.icon} {cat.name} <span className="text-xs text-[#4a5a7a]">{published.filter(c => c.category === cat.name).length}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-bold text-3xl text-[#f0f4ff]">Featured Courses</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('courses')}>View all →</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredCourses.map(course => {
              return (
                <Card key={course.id} className="overflow-hidden cursor-pointer" onClick={() => navigate('course-detail', { courseId: course.id })}>
                  <div className="h-40 bg-[#1a2540] relative">
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/60 to-transparent" />
                    <div className="absolute top-3 left-3"><LevelBadge level={course.level} /></div>
                  </div>
                  <div className="p-4">
                    <Badge variant="purple" className="mb-2">{course.category}</Badge>
                    <h3 className="font-display font-bold text-[#f0f4ff] mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-[#6b7fa8] mb-3 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between text-xs text-[#4a5a7a]">
                      <span>{course.instructorName}</span>
                      <span>{course.duration}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <CourseGridState loading={loading} error={error} empty={featuredCourses.length === 0} />
        </div>
      </section>

      {/* Cloud Banner */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/10 border-y border-[rgba(255,255,255,0.07)]">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="cyan" className="mb-4">☁️ Cloud Infrastructure</Badge>
          <h2 className="font-display font-bold text-3xl text-[#f0f4ff] mb-4">Designed for cloud deployment</h2>
          <p className="text-[#6b7fa8] mb-8 max-w-xl mx-auto">The platform separates presentation, application, data and infrastructure layers so each can be tested and scaled independently.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {['🔐 Role-based access control', '📱 Desktop and mobile browsers', '☁️ Cloud-ready architecture', '📊 Progress and reporting'].map(f => (
              <span key={f} className="text-sm text-[#a0b4d0] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] px-3 py-1.5 rounded-lg">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="font-display font-bold text-4xl md:text-5xl text-[#f0f4ff] mb-4">Ready to start learning?</h2>
        <p className="text-[#6b7fa8] mb-8 max-w-lg mx-auto">Create an account, or use a demo login above, to explore the student, instructor and administrator workspaces.</p>
        <Button size="lg" onClick={() => navigate('register')}>Create Account →</Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(255,255,255,0.07)] py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">C</span>
            </div>
            <span className="font-display font-bold text-[#f0f4ff]">CloudLearn</span>
          </div>
          <p className="text-xs text-[#4a5a7a]">CloudLearn · HND Computer Science seminar project, Yaba College of Technology</p>
        </div>
      </footer>
    </PublicLayout>
  );
}

// ── Course Browser (Public) ──────────────────────────────────────────────

export function CourseBrowser() {
  const { navigate } = useApp();
  const { courses, loading, error } = usePublishedCourses();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');

  const filtered = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && c.category !== category) return false;
    if (level && c.level !== level) return false;
    return true;
  });

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="font-display font-bold text-4xl text-[#f0f4ff] mb-2">All Courses</h1>
        <p className="text-[#6b7fa8] mb-8">{loading ? 'Loading…' : `${filtered.length} courses available`}</p>
        <div className="flex flex-wrap gap-3 mb-8">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses..."
            className="flex-1 min-w-48 px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] placeholder-[#4a5a7a] focus:outline-none focus:border-blue-500" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={level} onChange={e => setLevel(e.target.value)} className="px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
            <option value="">All Levels</option>
            <option>Beginner</option><option>Intermediate</option><option>Advanced</option>
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(course => {
            return (
              <Card key={course.id} className="overflow-hidden cursor-pointer" onClick={() => navigate('course-detail', { courseId: course.id })}>
                <div className="h-40 bg-[#1a2540] relative">
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/60 to-transparent" />
                  <div className="absolute top-3 left-3"><LevelBadge level={course.level} /></div>
                </div>
                <div className="p-4">
                  <Badge variant="purple" className="mb-2">{course.category}</Badge>
                  <h3 className="font-display font-bold text-[#f0f4ff] mb-1 line-clamp-2">{course.title}</h3>
                  <p className="text-xs text-[#6b7fa8] mb-3 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between text-xs text-[#4a5a7a]">
                    <span>{course.instructorName}</span>
                    <span>{course.duration}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <CourseGridState loading={loading} error={error} empty={filtered.length === 0} />
      </div>
    </PublicLayout>
  );
}

// ── Course Detail (Public) ──────────────────────────────────────────────

export function CourseDetail() {
  const { navigate, routeParams, enrollInCourse, currentUser, enrollments, dataReady } = useApp();
  const { courses, loading } = usePublishedCourses();
  const [enrolling, setEnrolling] = useState(false);
  const own = useApp().courses.find(c => c.id === routeParams.courseId);
  const course = own || courses.find(c => c.id === routeParams.courseId);
  if (loading || (currentUser && !dataReady)) return <PublicLayout><div className="p-8 text-center text-[#6b7fa8]">Loading…</div></PublicLayout>;
  if (!course) return <PublicLayout><div className="p-8 text-center text-[#6b7fa8]">Course not found</div></PublicLayout>;

  const isEnrolled = currentUser ? enrollments.some(e => e.studentId === currentUser.id && e.courseId === course.id) : false;
  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0);

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-6 py-12">
        <button onClick={() => navigate('courses')} className="flex items-center gap-2 text-sm text-[#6b7fa8] hover:text-white mb-6 transition-colors">
          ← Back to Courses
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Badge variant="purple" className="mb-3">{course.category}</Badge>
            <h1 className="font-display font-bold text-3xl text-[#f0f4ff] mb-4">{course.title}</h1>
            <p className="text-[#a0b4d0] mb-6 leading-relaxed">{course.description}</p>
            <div className="flex flex-wrap gap-3 mb-8 text-sm text-[#6b7fa8]">
              <span>⏱ {course.duration}</span>
              <span>👤 {course.enrolledCount.toLocaleString()} students</span>
              <span>📚 {course.modules.length} modules · {totalLessons} lessons</span>
              <LevelBadge level={course.level} />
            </div>
            <h2 className="font-display font-bold text-lg text-[#f0f4ff] mb-4">Course Content</h2>
            {!currentUser && <p className="text-sm text-[#6b7fa8] mb-3">Sign in to see the full module and lesson outline.</p>}
            <div className="space-y-3">
              {course.modules.map(mod => (
                <Card key={mod.id} className="p-4">
                  <h3 className="font-medium text-[#f0f4ff] mb-2">{mod.title}</h3>
                  <div className="space-y-1">
                    {mod.lessons.map(l => (
                      <div key={l.id} className="flex items-center gap-2 text-sm text-[#6b7fa8]">
                        <span>{l.type === 'video' ? '▶' : l.type === 'document' ? '📄' : '📊'}</span>
                        <span>{l.title}</span>
                        <span className="ml-auto text-xs">{l.duration}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <div className="sticky top-20">
              <Card className="overflow-hidden">
                <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover" />
                <div className="p-5">
                  {isEnrolled ? (
                    <Button className="w-full" onClick={() => navigate('student-learn', { courseId: course.id })}>
                      Continue Learning
                    </Button>
                  ) : currentUser && currentUser.role !== 'student' ? (
                    <p className="text-sm text-[#6b7fa8]">Only student accounts can enrol in courses.</p>
                  ) : (
                    <Button className="w-full" disabled={enrolling} onClick={async () => {
                      if (!currentUser) { navigate('login'); return; }
                      setEnrolling(true); await enrollInCourse(course.id); setEnrolling(false);
                    }}>
                      {currentUser ? (enrolling ? 'Enrolling…' : 'Enroll Now') : 'Sign in to Enroll'}
                    </Button>
                  )}
                  <div className="mt-4 space-y-2 text-sm text-[#6b7fa8]">
                    <div className="flex items-center gap-2"><span>👤</span> <span>Instructor: {course.instructorName}</span></div>
                    <div className="flex items-center gap-2"><span>📅</span> <span>Created {course.createdAt}</span></div>
                    <div className="flex items-center gap-2"><span>📱</span> <span>Access on all devices</span></div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
