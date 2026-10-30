import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, StatCard, SectionHeader } from '../../components/UI';
import { monthlyEnrollments, averageGradePercent } from '../../lib/derive';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'];

export default function Analytics() {
  const { currentUser, courses, submissions, assignments, enrollments, getEnrollmentsForCourse, getAssignmentsForCourse } = useApp();
  if (!currentUser) return null;

  // Administrators see platform-wide figures; instructors see their own courses.
  const myCourses = currentUser.role === 'admin' ? courses : courses.filter(c => c.instructorId === currentUser.id);
  const totalEnrollments = myCourses.reduce((a, c) => a + getEnrollmentsForCourse(c.id).length, 0);
  const myAssignments = myCourses.flatMap(c => getAssignmentsForCourse(c.id));
  const mySubmissions = submissions.filter(s => myAssignments.some(a => a.id === s.assignmentId));
  const gradedSubmissions = mySubmissions.filter(s => s.grade !== null);
  const avgGrade = averageGradePercent(gradedSubmissions, assignments);
  const trend = monthlyEnrollments(enrollments.filter(e => myCourses.some(c => c.id === e.courseId)));

  const courseData = myCourses.map(c => {
    const enrs = getEnrollmentsForCourse(c.id);
    return {
      name: c.title.slice(0, 18) + '...',
      students: enrs.length,
      avgProgress: enrs.length ? Math.round(enrs.reduce((a, e) => a + e.progress, 0) / enrs.length) : 0,
      completed: enrs.filter(e => e.progress === 100).length,
    };
  });

  const categoryData = Object.entries(
    myCourses.reduce<Record<string, number>>((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <DashboardLayout>
      <SectionHeader title="Analytics" description="Detailed performance insights for your courses" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={totalEnrollments} icon="👨‍🎓" color="blue" />
        <StatCard label="Published Courses" value={myCourses.filter(c => c.isPublished).length} icon="📚" color="green" sub={`of ${myCourses.length}`} />
        <StatCard label="Avg Grade" value={`${avgGrade}%`} icon="📊" color="yellow" sub={`${gradedSubmissions.length} graded`} />
        <StatCard label="Submissions" value={mySubmissions.length} icon="📝" color="purple" sub={`${mySubmissions.filter(s => s.status === 'submitted').length} pending`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Enrollment trend */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Enrolments by Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend}>
              <XAxis dataKey="month" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="students" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Course performance */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Course Performance</h3>
          {courseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={courseData}>
                <XAxis dataKey="name" stroke="#4a5a7a" tick={{ fontSize: 10 }} />
                <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="students" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Students" />
                <Bar dataKey="avgProgress" fill="#06b6d4" radius={[3, 3, 0, 0]} name="Avg Progress %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-[#4a5a7a] py-16 text-sm">Create and publish courses to see analytics</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Category distribution */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Courses by Category</h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {categoryData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-[#a0b4d0]">{d.name}</span>
                    <span className="ml-auto text-[#6b7fa8]">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-[#4a5a7a] py-8 text-sm">No courses yet</p>
          )}
        </Card>

        {/* Completion rates */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Course Completion Rates</h3>
          <div className="space-y-4">
            {courseData.map(c => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#a0b4d0] truncate flex-1">{c.name}</span>
                  <span className="text-[#6b7fa8] ml-2 shrink-0">{c.completed}/{c.students} completed</span>
                </div>
                <div className="h-2 bg-[#1a2540] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.students > 0 ? (c.completed / c.students) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {courseData.length === 0 && <p className="text-sm text-[#4a5a7a] text-center py-6">No data yet</p>}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
