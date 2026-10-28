import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, StatCard, Badge, Avatar, Button } from '../../components/UI';
import { monthlyEnrollments } from '../../lib/derive';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function InstructorDashboard() {
  const { currentUser, courses, enrollments, submissions, quizzes, navigate, getEnrollmentsForCourse, getAssignmentsForCourse, getUserById } = useApp();
  if (!currentUser) return null;

  const myCourses = courses.filter(c => c.instructorId === currentUser.id);
  const myStudentIds = new Set(
    enrollments.filter(e => myCourses.some(c => c.id === e.courseId)).map(e => e.studentId)
  );
  const pendingSubmissions = submissions.filter(s => {
    const a = myCourses.flatMap(c => getAssignmentsForCourse(c.id)).find(a => a.id === s.assignmentId);
    return a && s.status === 'submitted';
  });
  const myQuizzes = quizzes.filter(q => q.instructorId === currentUser.id);
  const trend = monthlyEnrollments(enrollments.filter(e => myCourses.some(c => c.id === e.courseId)));

  const courseEngagement = myCourses.map(c => ({
    name: c.title.slice(0, 20) + (c.title.length > 20 ? '...' : ''),
    students: getEnrollmentsForCourse(c.id).length,
    avgProgress: Math.round(getEnrollmentsForCourse(c.id).reduce((a, e) => a + e.progress, 0) / Math.max(getEnrollmentsForCourse(c.id).length, 1)),
  }));

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[#f0f4ff]">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="text-[#6b7fa8] text-sm mt-1">Here's your instructor overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Courses" value={myCourses.length} icon="📚" color="blue" sub={`${myCourses.filter(c => c.isPublished).length} published`} />
        <StatCard label="Total Students" value={myStudentIds.size} icon="👨‍🎓" color="green" />
        <StatCard label="Pending Reviews" value={pendingSubmissions.length} icon="📝" color="yellow" />
        <StatCard label="Quizzes Created" value={myQuizzes.length} icon="❓" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Enrollment trend */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Enrolments in My Courses</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="enrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="students" stroke="#06b6d4" fill="url(#enrGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent submissions */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">Recent Submissions</h3>
            <button onClick={() => navigate('instructor-grading')} className="text-xs text-blue-400 hover:text-blue-300">Review all</button>
          </div>
          <div className="space-y-3">
            {pendingSubmissions.slice(0, 5).map(s => {
              const student = getUserById(s.studentId);
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <Avatar src={student?.avatar} name={student?.name || ''} size={28} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f0f4ff] truncate">{student?.name}</p>
                    <p className="text-xs text-[#4a5a7a] truncate">{s.fileName}</p>
                  </div>
                  <Badge variant="yellow">Pending</Badge>
                </div>
              );
            })}
            {pendingSubmissions.length === 0 && <p className="text-sm text-[#4a5a7a] text-center py-4">No pending reviews 🎉</p>}
          </div>
        </Card>
      </div>

      {/* Course engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Course Engagement</h3>
          {courseEngagement.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={courseEngagement}>
                <XAxis dataKey="name" stroke="#4a5a7a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Students" />
                <Bar dataKey="avgProgress" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Avg Progress %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#4a5a7a] text-center py-8">Create courses to see engagement data</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">My Courses</h3>
            <Button size="sm" onClick={() => navigate('instructor-courses')}>View all</Button>
          </div>
          <div className="space-y-3">
            {myCourses.slice(0, 4).map(c => {
              const enrolled = getEnrollmentsForCourse(c.id).length;
              return (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)]">
                  <div className="w-10 h-10 rounded-lg bg-[#1a2540] overflow-hidden shrink-0">
                    <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f0f4ff] truncate">{c.title}</p>
                    <p className="text-xs text-[#4a5a7a]">{enrolled} students</p>
                  </div>
                  <Badge variant={c.isPublished ? 'green' : 'gray'}>{c.isPublished ? 'Live' : 'Draft'}</Badge>
                </div>
              );
            })}
            {myCourses.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-[#4a5a7a] mb-3">No courses yet</p>
                <Button size="sm" onClick={() => navigate('instructor-create-course')}>Create Course</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
