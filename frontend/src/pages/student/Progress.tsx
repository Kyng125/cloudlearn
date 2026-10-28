import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, StatCard, ProgressBar, Badge, SectionHeader } from '../../components/UI';
import { ACTIVITY_DATA } from '../../data';
import { averageGradePercent } from '../../lib/derive';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';

export default function Progress() {
  const { currentUser, enrollments, submissions, quizAttempts, assignments, getCourseById } = useApp();
  if (!currentUser) return null;

  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const myCourses = myEnrollments.map(e => ({ enrollment: e, course: getCourseById(e.courseId)! })).filter(x => x.course);
  const mySubmissions = submissions.filter(s => s.studentId === currentUser.id && s.grade !== null);
  const myAttempts = quizAttempts.filter(a => a.studentId === currentUser.id);

  const avgGrade = averageGradePercent(mySubmissions, assignments);
  const avgQuizScore = myAttempts.length
    ? Math.round(myAttempts.reduce((acc, a) => acc + (a.score / a.totalPoints * 100), 0) / myAttempts.length)
    : 0;
  const completedCourses = myEnrollments.filter(e => e.progress === 100).length;
  const overallProgress = myEnrollments.length
    ? Math.round(myEnrollments.reduce((a, e) => a + e.progress, 0) / myEnrollments.length)
    : 0;

  const radarData = [
    { subject: 'Assignments', value: avgGrade },
    { subject: 'Quizzes', value: avgQuizScore },
    { subject: 'Progress', value: overallProgress },
    { subject: 'Timeliness', value: mySubmissions.filter(s => !submissions.find(x => x.id === s.id)?.isLate).length / Math.max(mySubmissions.length, 1) * 100 },
  ];

  return (
    <DashboardLayout>
      <SectionHeader title="My Progress" description="Overview of your learning performance" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Overall Progress" value={`${overallProgress}%`} icon="📈" color="blue" />
        <StatCard label="Courses Completed" value={completedCourses} icon="✅" color="green" sub={`of ${myEnrollments.length}`} />
        <StatCard label="Avg Assignment Grade" value={`${avgGrade}%`} icon="📝" color="yellow" />
        <StatCard label="Avg Quiz Score" value={`${avgQuizScore}%`} icon="❓" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Course progress */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Course Completion</h3>
          <div className="space-y-4">
            {myCourses.map(({ enrollment, course }) => (
              <div key={enrollment.id}>
                <div className="flex justify-between items-center mb-1 text-sm">
                  <span className="text-[#a0b4d0] truncate flex-1">{course.title}</span>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {enrollment.progress === 100 && <Badge variant="green">Complete</Badge>}
                    <span className="text-[#6b7fa8] font-mono text-xs">{enrollment.progress}%</span>
                  </div>
                </div>
                <ProgressBar value={enrollment.progress} color={enrollment.progress === 100 ? 'green' : enrollment.progress > 50 ? 'blue' : 'yellow'} />
              </div>
            ))}
            {myCourses.length === 0 && <p className="text-sm text-[#4a5a7a] text-center py-4">Enroll in courses to track progress</p>}
          </div>
        </Card>

        {/* Performance radar */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Performance Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7fa8', fontSize: 12 }} />
              <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Weekly activity */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Weekly Study Time (min) <span className="text-xs font-normal text-[#4a5a7a]">(sample data)</span></h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ACTIVITY_DATA}>
              <XAxis dataKey="week" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="minutes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Quiz performance */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Quiz Performance</h3>
          {myAttempts.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={myAttempts.map(a => ({ name: `Quiz`, score: Math.round(a.score / a.totalPoints * 100), fill: a.passed ? '#10b981' : '#ef4444' }))}>
                  <XAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} stroke="#4a5a7a" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {myAttempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-[#a0b4d0]">Attempt {a.id.slice(-1)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#f0f4ff] font-mono">{a.score}/{a.totalPoints}</span>
                      <Badge variant={a.passed ? 'green' : 'red'}>{a.passed ? 'Pass' : 'Fail'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#4a5a7a] text-center py-8">No quiz attempts yet</p>
          )}
        </Card>
      </div>

      {/* Achievements */}
      <Card className="p-5">
        <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Achievements</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { icon: '🎓', label: 'First Enrollment', earned: myEnrollments.length > 0 },
            { icon: '✅', label: 'Course Complete', earned: completedCourses > 0 },
            { icon: '📝', label: 'Assignment Submitted', earned: submissions.filter(s => s.studentId === currentUser.id).length > 0 },
            { icon: '❓', label: 'Quiz Taker', earned: myAttempts.length > 0 },
            { icon: '🏆', label: 'High Achiever', earned: avgGrade >= 90 },
            { icon: '💬', label: 'Community Member', earned: true },
            { icon: '⚡', label: 'Quick Starter', earned: myEnrollments.length >= 2 },
            { icon: '🌟', label: 'Star Student', earned: completedCourses >= 2 },
          ].map(a => (
            <div key={a.label} className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-center w-24 ${a.earned ? 'border-amber-500/30 bg-amber-500/5' : 'border-[rgba(255,255,255,0.05)] opacity-40'}`}>
              <span className="text-3xl">{a.icon}</span>
              <span className="text-xs text-[#a0b4d0] leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
