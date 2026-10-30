import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, StatCard, ProgressBar, Badge, Button } from '../../components/UI';
import { averageGradePercent, gradePercent } from '../../lib/derive';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
  const { currentUser, enrollments, submissions, quizAttempts, navigate, notifications, assignments, getCourseById, getAssignmentsForCourse, getQuizzesForCourse, quizzes, dataReady } = useApp();
  if (!currentUser) return null;
  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;

  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const myCourses = myEnrollments.map(e => ({ enrollment: e, course: getCourseById(e.courseId)! })).filter(x => x.course);
  const completedCourses = myEnrollments.filter(e => e.progress === 100).length;
  const mySubmissions = submissions.filter(s => s.studentId === currentUser.id);
  const gradedSubmissions = mySubmissions.filter(s => s.grade !== null);
  const avgGrade = averageGradePercent(gradedSubmissions, assignments);
  const quizTitle = (id: string) => quizzes.find(q => q.id === id)?.title ?? 'Quiz';
  const unreadNotifs = notifications.filter(n => n.userId === currentUser.id && !n.isRead);

  // Recent results: graded assignments and quiz attempts as percentages, oldest to newest
  const results = [
    ...gradedSubmissions.map(sub => ({ label: assignments.find(a => a.id === sub.assignmentId)?.title ?? 'Assignment', when: sub.submittedAt, score: gradePercent(sub, assignments) ?? 0 })),
    ...quizAttempts.filter(a => a.studentId === currentUser.id).map(a => ({ label: quizTitle(a.quizId), when: a.completedAt, score: a.totalPoints ? Math.round((a.score / a.totalPoints) * 100) : 0 })),
  ].sort((x, y) => new Date(x.when).getTime() - new Date(y.when).getTime()).slice(-8);

  // Upcoming assignments
  const upcoming = myCourses.flatMap(({ course }) =>
    getAssignmentsForCourse(course.id).map(a => ({ ...a, courseName: course.title }))
  ).filter(a => {
    const sub = submissions.find(s => s.assignmentId === a.id && s.studentId === currentUser.id);
    return !sub && new Date(a.dueDate) > new Date();
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 3);

  // Upcoming quizzes
  const upcomingQuizzes = myCourses.flatMap(({ course }) =>
    getQuizzesForCourse(course.id).map(q => ({ ...q, courseName: course.title }))
  ).filter(q => {
    const attempted = quizAttempts.some(a => a.quizId === q.id && a.studentId === currentUser.id);
    return !attempted;
  }).slice(0, 3);

  return (
    <DashboardLayout>
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-[#f0f4ff]">
          Welcome back, {currentUser.name.split(' ')[0]}! 👋
        </h1>
        <p className="text-[#6b7fa8] text-sm mt-1">Here's your learning overview for today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Enrolled Courses" value={myEnrollments.length} icon="📚" color="blue" />
        <StatCard label="Completed" value={completedCourses} icon="✅" color="green" sub={`of ${myEnrollments.length}`} />
        <StatCard label="Avg Grade" value={`${avgGrade}%`} icon="📊" color="yellow" sub={`${gradedSubmissions.length} graded`} />
        <StatCard label="Notifications" value={unreadNotifs.length} icon="🔔" color="purple" sub="unread" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Learning Activity Chart */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Recent Results (%)</h3>
          {results.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={results}>
                <XAxis dataKey="label" stroke="#4a5a7a" tick={{ fontSize: 10 }} interval={0} tickFormatter={(v: string) => v.slice(0, 10)} />
                <YAxis domain={[0, 100]} stroke="#4a5a7a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[#4a5a7a] text-center py-12">Your graded work and quiz scores will appear here</p>}
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">Recent Notifications</h3>
            <button onClick={() => navigate('student-notifications')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
          </div>
          <div className="space-y-3">
            {unreadNotifs.slice(0, 4).map(n => (
              <div key={n.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)]">
                <span className="text-lg">{n.type === 'grade' ? '📊' : n.type === 'assignment' ? '📝' : n.type === 'message' ? '✉️' : '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0f4ff] truncate">{n.title}</p>
                  <p className="text-xs text-[#6b7fa8] truncate">{n.body}</p>
                </div>
              </div>
            ))}
            {unreadNotifs.length === 0 && <p className="text-sm text-[#4a5a7a] text-center py-4">No new notifications</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* Course Progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">Course Progress</h3>
            <button onClick={() => navigate('student-my-courses')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
          </div>
          <div className="space-y-4">
            {myCourses.slice(0, 4).map(({ enrollment, course }) => (
              <div key={enrollment.id} className="cursor-pointer" onClick={() => navigate('student-learn', { courseId: course.id })}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-[#f0f4ff] font-medium truncate flex-1">{course.title}</span>
                  <span className="text-[#6b7fa8] ml-2">{enrollment.progress}%</span>
                </div>
                <ProgressBar value={enrollment.progress} color={enrollment.progress === 100 ? 'green' : 'blue'} />
              </div>
            ))}
            {myCourses.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[#4a5a7a] text-sm mb-3">No enrolled courses yet</p>
                <Button size="sm" onClick={() => navigate('courses')}>Browse Courses</Button>
              </div>
            )}
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">Upcoming Deadlines</h3>
            <button onClick={() => navigate('student-assignments')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
          </div>
          <div className="space-y-3">
            {upcoming.map(a => {
              const due = new Date(a.dueDate);
              const daysLeft = Math.ceil((due.getTime() - Date.now()) / 86400000);
              return (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)] rounded-lg border border-[rgba(255,255,255,0.05)]">
                  <span className="text-xl">📝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f0f4ff] truncate">{a.title}</p>
                    <p className="text-xs text-[#4a5a7a] truncate">{a.courseName}</p>
                  </div>
                  <Badge variant={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'yellow' : 'gray'}>
                    {daysLeft}d left
                  </Badge>
                </div>
              );
            })}
            {upcoming.length === 0 && <p className="text-sm text-[#4a5a7a] text-center py-4">No upcoming deadlines 🎉</p>}
          </div>

          <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <p className="text-xs font-medium text-[#6b7fa8] mb-3">Upcoming Quizzes</p>
            <div className="space-y-2">
              {upcomingQuizzes.map(q => (
                <div key={q.id} className="flex items-center gap-2 text-sm">
                  <span className="text-base">{q.isExam ? '📋' : '❓'}</span>
                  <span className="text-[#f0f4ff] truncate flex-1">{q.title}</span>
                  <Badge variant={q.isExam ? 'red' : 'blue'}>{q.isExam ? 'Exam' : 'Quiz'}</Badge>
                </div>
              ))}
              {upcomingQuizzes.length === 0 && <p className="text-xs text-[#4a5a7a]">No upcoming quizzes</p>}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Grades */}
      <Card className="p-5 mt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[#f0f4ff]">Recent Grades</h3>
        </div>
        {gradedSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gradedSubmissions.slice(0, 3).map(sub => {
              const pct = gradePercent(sub, assignments) ?? 0;
              return (
                <div key={sub.id} className="p-4 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-display font-bold" style={{ color: pct >= 90 ? '#10b981' : pct >= 75 ? '#3b82f6' : pct >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {pct}%
                    </span>
                    <Badge variant={pct >= 90 ? 'green' : pct >= 75 ? 'blue' : pct >= 60 ? 'yellow' : 'red'}>
                      {pct >= 90 ? 'A' : pct >= 75 ? 'B' : pct >= 60 ? 'C' : 'F'}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#6b7fa8] truncate">{sub.fileName}</p>
                  {sub.feedback && <p className="text-xs text-[#4a5a7a] mt-1 line-clamp-2">"{sub.feedback}"</p>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#4a5a7a] text-center py-4">No graded submissions yet</p>
        )}
      </Card>
    </DashboardLayout>
  );
}
