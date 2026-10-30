import { useState, useEffect } from 'react';
import { useApp } from '../../context';
import { api } from '../../api';
import type { LogRow } from './AdminPages';
import { DashboardLayout } from '../../components/Layout';
import { Card, StatCard, Badge, Avatar } from '../../components/UI';
import { monthlyEnrollments } from '../../lib/derive';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminDashboard() {
  const { users, courses, enrollments, navigate } = useApp();

  const [logs, setLogs] = useState<LogRow[]>([]);
  useEffect(() => { api.get('/admin/activity-logs?limit=6').then(r => setLogs(r.logs)).catch(() => setLogs([])); }, []);

  const students = users.filter(u => u.role === 'student');
  const instructors = users.filter(u => u.role === 'instructor');
  const activeCourses = courses.filter(c => c.isPublished);
  const recentUsers = [...users].sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()).slice(0, 5);
  const totalEnrollments = enrollments.length;
  const trend = monthlyEnrollments(enrollments);
  const ROLE_DATA = [
    { name: 'Students', value: students.length, color: '#3b82f6' },
    { name: 'Instructors', value: instructors.length, color: '#06b6d4' },
    { name: 'Admins', value: users.filter(u => u.role === 'admin').length, color: '#8b5cf6' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#f0f4ff]">Admin Dashboard</h1>
          <p className="text-[#6b7fa8] text-sm mt-1">Platform overview and management controls</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={users.length} icon="👥" color="blue" sub={`${users.filter(u => u.isActive).length} active`} />
        <StatCard label="Students" value={students.length} icon="🎓" color="green" />
        <StatCard label="Instructors" value={instructors.length} icon="👨‍🏫" color="yellow" />
        <StatCard label="Active Courses" value={activeCourses.length} icon="📚" color="purple" sub={`${courses.length} total`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Enrollment trend */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Enrolments by Month</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <YAxis stroke="#4a5a7a" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="students" stroke="#8b5cf6" fill="url(#adminGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* User distribution */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={ROLE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value">
                {ROLE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {ROLE_DATA.map(d => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                <span className="text-[#a0b4d0]">{d.name}</span>
                <span className="ml-auto text-[#f0f4ff] font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent registrations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-[#f0f4ff]">Recent Registrations</h3>
            <button onClick={() => navigate('admin-users')} className="text-xs text-blue-400 hover:text-blue-300">View all</button>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar src={u.avatar} name={u.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f0f4ff] truncate">{u.name}</p>
                  <p className="text-xs text-[#4a5a7a]">{u.email} · {u.joinedAt}</p>
                </div>
                <Badge variant={u.role === 'student' ? 'blue' : u.role === 'instructor' ? 'yellow' : 'purple'}>{u.role}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Platform Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Enrollments', value: totalEnrollments, icon: '📋' },
              { label: 'Published Courses', value: activeCourses.length, icon: '✅' },
              { label: 'Draft Courses', value: courses.filter(c => !c.isPublished).length, icon: '📝' },
              { label: 'Active Users', value: users.filter(u => u.isActive).length, icon: '👤' },
              { label: 'Inactive Users', value: users.filter(u => !u.isActive).length, icon: '🔒' },
              { label: 'Total Courses', value: courses.length, icon: '📚' },
            ].map(s => (
              <div key={s.label} className="p-3 bg-[rgba(255,255,255,0.02)] rounded-xl border border-[rgba(255,255,255,0.05)] text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-[#f0f4ff]">{s.value}</div>
                <div className="text-xs text-[#6b7fa8]">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity Log */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[#f0f4ff]">Recent Activity Log</h3>
          <button onClick={() => navigate('admin-logs')} className="text-xs text-blue-400 hover:text-blue-300">View full log</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Time', 'User', 'Action', 'IP', 'Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((e) => (
                <tr key={e.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-3 py-2 font-mono text-xs text-[#6b7fa8]">{e.at.replace('T', ' ').slice(0, 16)}</td>
                  <td className="px-3 py-2 text-[#a0b4d0]">{e.user || '—'}</td>
                  <td className="px-3 py-2 text-[#f0f4ff]">{e.action}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[#6b7fa8]">{e.ip || ''}</td>
                  <td className="px-3 py-2"><Badge variant={e.status === 'success' ? 'green' : 'red'}>{e.status}</Badge></td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[#4a5a7a]">No activity recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}
