import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, SearchInput, SectionHeader, StatCard } from '../../components/UI';
import { CATEGORIES, ACTIVITY_DATA } from '../../data';
import { monthlyEnrollments, averageGradePercent } from '../../lib/derive';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// ── Course Management ──────────────────────────────────────────────────────

export function AdminCourses() {
  const { courses, toggleCoursePublished, getUserById, getEnrollmentsForCourse } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'published' && !c.isPublished) return false;
    if (filterStatus === 'draft' && c.isPublished) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <SectionHeader title="Course Management" description={`${courses.length} total courses`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search courses..." className="flex-1 min-w-48" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Course', 'Instructor', 'Category', 'Students', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(course => {
                const instructor = getUserById(course.instructorId);
                const enrolled = getEnrollmentsForCourse(course.id).length;
                return (
                  <tr key={course.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1a2540] shrink-0">
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div>
                          <div className="font-medium text-[#f0f4ff] max-w-48 truncate">{course.title}</div>
                          <div className="text-xs text-[#4a5a7a]">{course.duration}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar src={instructor?.avatar} name={instructor?.name || ''} size={24} />
                        <span className="text-[#a0b4d0]">{instructor?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="purple">{course.category}</Badge></td>
                    <td className="px-4 py-3 text-[#f0f4ff]">{enrolled}</td>
                    <td className="px-4 py-3"><Badge variant={course.isPublished ? 'green' : 'gray'}>{course.isPublished ? 'Published' : 'Draft'}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="xs" variant={course.isPublished ? 'secondary' : 'primary'} onClick={() => toggleCoursePublished(course.id)}>
                          {course.isPublished ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[#4a5a7a]">No courses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ── Categories ──────────────────────────────────────────────────────────────

export function AdminCategories() {
  const [catList, setCatList] = useState(CATEGORIES);
  const [newCat, setNewCat] = useState('');
  const [newIcon, setNewIcon] = useState('📁');

  const handleAdd = () => {
    if (!newCat.trim()) return;
    setCatList(prev => [...prev, { id: `cat${Date.now()}`, name: newCat, icon: newIcon, courseCount: 0 }]);
    setNewCat('');
  };

  return (
    <DashboardLayout>
      <SectionHeader title="Category Management" description="Manage course categories" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)]">
                    {['Icon', 'Category', 'Courses', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catList.map(cat => (
                    <tr key={cat.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="px-4 py-3 text-2xl">{cat.icon}</td>
                      <td className="px-4 py-3 font-medium text-[#f0f4ff]">{cat.name}</td>
                      <td className="px-4 py-3 text-[#6b7fa8]">{cat.courseCount}</td>
                      <td className="px-4 py-3">
                        <Button size="xs" variant="danger" onClick={() => setCatList(prev => prev.filter(c => c.id !== cat.id))}>Remove</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="p-5 h-fit">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Add Category</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#6b7fa8] mb-1 block">Icon (emoji)</label>
              <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] text-center text-2xl"
                maxLength={2} />
            </div>
            <div>
              <label className="text-sm text-[#6b7fa8] mb-1 block">Category Name</label>
              <input value={newCat} onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]"
                placeholder="e.g. Artificial Intelligence" />
            </div>
            <Button className="w-full justify-center" onClick={handleAdd} disabled={!newCat.trim()}>Add Category</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function AdminReports() {
  const { users, enrollments, submissions, assignments } = useApp();

  const completionRate = enrollments.length ? Math.round(enrollments.filter(e => e.progress === 100).length / enrollments.length * 100) : 0;
  const avgGrade = averageGradePercent(submissions, assignments);
  const trend = monthlyEnrollments(enrollments);

  return (
    <DashboardLayout>
      <SectionHeader title="Reports & Analytics" description="Comprehensive platform reports" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={users.length} icon="👥" color="blue" />
        <StatCard label="Total Enrollments" value={enrollments.length} icon="📋" color="green" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} icon="✅" color="yellow" />
        <StatCard label="Avg Grade" value={`${avgGrade}%`} icon="📊" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Enrolments by Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend}>
              <XAxis dataKey="month" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="students" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Platform Activity <span className="text-xs font-normal text-[#4a5a7a]">(sample data)</span></h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={ACTIVITY_DATA}>
              <XAxis dataKey="week" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="minutes" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold text-[#f0f4ff] mb-1">Downloadable reports</h3>
        <p className="text-sm text-[#6b7fa8]">Users, course performance and assessment result reports with CSV export are added with the backend.</p>
      </Card>
    </DashboardLayout>
  );
}

// ── Activity Logs ──────────────────────────────────────────────────────────

const FULL_LOGS = [
  { time: '2024-07-23 14:32:01', user: 'student@cloudlearn.com', action: 'User logged in', resource: 'Authentication', ip: '192.168.1.1', status: 'success' },
  { time: '2024-07-23 14:28:15', user: 'instructor@cloudlearn.com', action: 'Course published', resource: 'Course: Python Bootcamp', ip: '10.0.0.5', status: 'success' },
  { time: '2024-07-23 14:25:33', user: 'student@cloudlearn.com', action: 'Assignment submitted', resource: 'Assignment: Python Functions', ip: '192.168.1.1', status: 'success' },
  { time: '2024-07-23 14:15:22', user: 'emily.r@example.com', action: 'Enrolled in course', resource: 'Course: Data Science', ip: '172.16.0.3', status: 'success' },
  { time: '2024-07-23 13:50:11', user: 'unknown@attacker.com', action: 'Failed login (3rd attempt)', resource: 'Authentication', ip: '45.33.32.156', status: 'failed' },
  { time: '2024-07-23 13:45:08', user: 'admin@cloudlearn.com', action: 'Modified user role', resource: 'User: priya.p', ip: '192.168.1.100', status: 'success' },
  { time: '2024-07-23 13:30:45', user: 'james.o@example.com', action: 'Created quiz', resource: 'Quiz: Marketing Fundamentals', ip: '10.0.0.8', status: 'success' },
  { time: '2024-07-23 13:15:22', user: 'david.k@example.com', action: 'Completed lesson', resource: 'Lesson: React Hooks', ip: '192.168.1.45', status: 'success' },
  { time: '2024-07-23 12:58:19', user: 'admin@cloudlearn.com', action: 'System backup initiated', resource: 'System', ip: '192.168.1.100', status: 'success' },
  { time: '2024-07-23 12:45:33', user: 'lisa.t@example.com', action: 'Graded assignment', resource: 'Assignment: Threat Modeling', ip: '10.0.0.12', status: 'success' },
];

export function ActivityLogs() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = FULL_LOGS.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.user.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <SectionHeader title="Activity Logs" description="Sample entries only: live event logging is added with the backend" />

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="flex-1 min-w-48" />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
          <option value="all">All Events</option>
          <option value="success">Successful</option>
          <option value="failed">Failed / Security</option>
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Timestamp', 'User', 'Action', 'Resource', 'IP', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={i} className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] ${l.status === 'failed' ? 'bg-red-500/3' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-[#6b7fa8]">{l.time}</td>
                  <td className="px-4 py-3 text-[#a0b4d0]">{l.user}</td>
                  <td className="px-4 py-3 text-[#f0f4ff]">{l.action}</td>
                  <td className="px-4 py-3 text-[#6b7fa8]">{l.resource}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#4a5a7a]">{l.ip}</td>
                  <td className="px-4 py-3"><Badge variant={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#4a5a7a]">No log entries match your filter</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ── Backup & Recovery ──────────────────────────────────────────────────────

const BACKUPS = [
  { id: 'bk1', name: 'Full Backup', date: '2024-07-23 03:00:00', size: '2.4 GB', type: 'Automatic', status: 'completed' },
  { id: 'bk2', name: 'Full Backup', date: '2024-07-22 03:00:00', size: '2.3 GB', type: 'Automatic', status: 'completed' },
  { id: 'bk3', name: 'Manual Backup', date: '2024-07-20 14:32:00', size: '2.2 GB', type: 'Manual', status: 'completed' },
  { id: 'bk4', name: 'Full Backup', date: '2024-07-21 03:00:00', size: '2.3 GB', type: 'Automatic', status: 'completed' },
  { id: 'bk5', name: 'Partial Backup', date: '2024-07-19 03:00:00', size: '1.1 GB', type: 'Automatic', status: 'partial' },
];

export function BackupRecovery() {
  const { addToast } = useApp();
  const [running, setRunning] = useState(false);

  const startBackup = async () => {
    setRunning(true);
    await new Promise(r => setTimeout(r, 2000));
    setRunning(false);
    addToast('Simulated backup recorded (no data was written)', 'info');
  };

  return (
    <DashboardLayout>
      <SectionHeader title="Backup & Recovery" description="Simulated in the prototype: real backup and restore are added with the backend" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Last Backup" value="Sample" icon="💾" color="green" sub="simulated data" />
        <StatCard label="Total Backups" value={BACKUPS.length} icon="📦" color="blue" sub="30-day retention" />
        <StatCard label="Storage Used" value="Sample" icon="☁️" color="purple" sub="simulated data" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <div className="p-4 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between">
              <h3 className="font-display font-bold text-[#f0f4ff]">Backup History</h3>
              <Button size="sm" onClick={startBackup} disabled={running}>
                {running ? '⏳ Running...' : '▶ Start Backup'}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)]">
                    {['Name', 'Date', 'Size', 'Type', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BACKUPS.map(b => (
                    <tr key={b.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="px-4 py-3 font-medium text-[#f0f4ff]">{b.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#6b7fa8]">{b.date}</td>
                      <td className="px-4 py-3 text-[#a0b4d0]">{b.size}</td>
                      <td className="px-4 py-3"><Badge variant={b.type === 'Manual' ? 'blue' : 'gray'}>{b.type}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={b.status === 'completed' ? 'green' : 'yellow'}>{b.status}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="xs" variant="ghost" onClick={() => addToast('Simulated: restore is not available in the prototype', 'info')}>Restore</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-display font-bold text-[#f0f4ff] mb-4">System Status</h3>
            <div className="space-y-3">
              {[
                { label: 'Database', status: 'operational', latency: '12ms' },
                { label: 'File Storage', status: 'operational', latency: '45ms' },
                { label: 'CDN', status: 'operational', latency: '8ms' },
                { label: 'Email Service', status: 'operational', latency: '120ms' },
                { label: 'Backup Service', status: 'operational', latency: 'N/A' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-sm text-[#a0b4d0]">{s.label}</span>
                  </div>
                  <span className="font-mono text-xs text-[#4a5a7a]">{s.latency}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Backup Schedule</h3>
            <div className="space-y-2 text-sm text-[#a0b4d0]">
              <div className="flex justify-between"><span>Daily</span><span className="text-[#6b7fa8]">03:00 UTC</span></div>
              <div className="flex justify-between"><span>Weekly</span><span className="text-[#6b7fa8]">Sunday 02:00 UTC</span></div>
              <div className="flex justify-between"><span>Retention</span><span className="text-[#6b7fa8]">30 days</span></div>
              <div className="flex justify-between"><span>Encryption</span><span className="text-emerald-400">AES-256</span></div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ── System Settings ──────────────────────────────────────────────────────────

export function SystemSettings() {
  const { addToast } = useApp();
  const [platformName, setPlatformName] = useState('CloudLearn');
  const [maxStudents, setMaxStudents] = useState('50000');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [savedTab, setSavedTab] = useState('general');

  const handleSave = () => { addToast('Saved for this session only (prototype)', 'info'); };

  return (
    <DashboardLayout>
      <SectionHeader title="System Settings" description="Configure platform-wide settings" />

      <div className="flex gap-2 mb-6">
        {['general', 'notifications', 'security', 'cloud'].map(t => (
          <button key={t} onClick={() => setSavedTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${savedTab === t ? 'bg-blue-600 text-white' : 'text-[#6b7fa8] hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {savedTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Platform Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#6b7fa8] block mb-1">Platform Name</label>
                <input value={platformName} onChange={e => setPlatformName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
              </div>
              <div>
                <label className="text-sm text-[#6b7fa8] block mb-1">Max Students per Course</label>
                <input value={maxStudents} onChange={e => setMaxStudents(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-[#f0f4ff]">Maintenance Mode</div>
                  <div className="text-xs text-[#4a5a7a]">Temporarily disable the platform</div>
                </div>
                <button onClick={() => setMaintenanceMode(m => !m)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${maintenanceMode ? 'bg-red-600' : 'bg-[#1a2540]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${maintenanceMode ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <Button onClick={handleSave}>Save Settings</Button>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Platform Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Version', value: '0.1.0 (prototype)' },
                { label: 'Environment', value: 'Demonstration' },
                { label: 'Data store', value: 'Browser localStorage (prototype)' },
                { label: 'Backend', value: 'Not connected' },
              ].map(i => (
                <div key={i.label} className="flex justify-between">
                  <span className="text-[#6b7fa8]">{i.label}</span>
                  <span className="font-mono text-[#f0f4ff]">{i.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {savedTab === 'notifications' && (
        <Card className="p-5 max-w-lg">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Notification Settings</h3>
          <div className="space-y-4">
            {[
              { label: 'Email Notifications', value: emailNotifs, set: setEmailNotifs },
              { label: 'SMS Notifications', value: smsNotifs, set: setSmsNotifs },
            ].map(n => (
              <div key={n.label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.07)]">
                <span className="text-sm font-medium text-[#f0f4ff]">{n.label}</span>
                <button onClick={() => n.set((v: boolean) => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${n.value ? 'bg-blue-600' : 'bg-[#1a2540]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${n.value ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
            <Button onClick={handleSave}>Save Preferences</Button>
          </div>
        </Card>
      )}

      {savedTab === 'security' && (
        <Card className="p-5 max-w-lg">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Security Settings</h3>
          <div className="space-y-4 text-sm">
            {[
              { label: 'Role-based access control', enabled: true },
              { label: 'Password hashing', enabled: false },
              { label: 'Login throttling', enabled: false },
              { label: 'HTTPS / secure cookies', enabled: false },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.07)]">
                <span className="text-[#f0f4ff]">{s.label}</span>
                <Badge variant={s.enabled ? 'green' : 'gray'}>{s.enabled ? 'Active' : 'Planned (backend)'}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {savedTab === 'cloud' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { title: 'Cloud Storage', icon: '☁️', status: 'Simulated', provider: 'Not connected', usage: 'Uploads are stored with the backend' },
            { title: 'Database', icon: '🗄️', status: 'Simulated', provider: 'Browser localStorage', usage: 'Replaced by the server database' },
          ].map(s => (
            <Card key={s.title} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <h3 className="font-display font-bold text-[#f0f4ff]">{s.title}</h3>
                  <Badge variant="yellow">{s.status}</Badge>
                </div>
              </div>
              <div className="text-sm text-[#6b7fa8] space-y-1">
                <div>Provider: {s.provider}</div>
                <div>Usage: {s.usage}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Instructor Profile (reuse student profile) ──────────────────────────────

export function InstructorProfile() {
  const { currentUser, updateUser } = useApp();
  if (!currentUser) return null;

  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);

  return (
    <DashboardLayout>
      <SectionHeader title="Profile & Settings" />
      <div className="max-w-xl space-y-4">
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Profile Information</h3>
          <div className="flex items-center gap-4 mb-4">
            <Avatar src={currentUser.avatar} name={currentUser.name} size={64} />
            <div>
              <div className="font-bold text-[#f0f4ff]">{currentUser.name}</div>
              <div className="text-sm text-[#6b7fa8]">{currentUser.email}</div>
              <Badge variant="yellow" className="mt-1">Instructor</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-[#6b7fa8] block mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
            </div>
            <div>
              <label className="text-sm text-[#6b7fa8] block mb-1">Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-[#6b7fa8] block mb-1">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
              </div>
              <div>
                <label className="text-sm text-[#6b7fa8] block mb-1">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]" />
              </div>
            </div>
            <Button onClick={() => updateUser(currentUser.id, { name, bio, phone, location })}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
