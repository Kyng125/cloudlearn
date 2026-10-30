import { useState, type ReactNode } from 'react';
import { useApp, type Route } from '../context';
import { Avatar } from './UI';

// ── Icons ──────────────────────────────────────────────────────────────────

const Icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  courses: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  assignments: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  quiz: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  progress: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  discussions: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  messages: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  notifications: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  profile: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  analytics: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  reports: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  logs: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>,
  backup: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  cloud: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
  grading: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  create: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  categories: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
};

// ── Nav Items by Role ──────────────────────────────────────────────────────

const studentNav: { id: Route; label: string; icon: ReactNode; badge?: string }[] = [
  { id: 'student-dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { id: 'student-my-courses', label: 'My Courses', icon: Icons.courses },
  { id: 'student-assignments', label: 'Assignments', icon: Icons.assignments },
  { id: 'student-quiz', label: 'Quizzes & Exams', icon: Icons.quiz },
  { id: 'student-progress', label: 'Progress', icon: Icons.progress },
  { id: 'student-discussions', label: 'Discussions', icon: Icons.discussions },
  { id: 'student-messages', label: 'Messages', icon: Icons.messages },
  { id: 'student-notifications', label: 'Notifications', icon: Icons.notifications },
  { id: 'student-profile', label: 'Profile & Settings', icon: Icons.profile },
];

const instructorNav: { id: Route; label: string; icon: ReactNode }[] = [
  { id: 'instructor-dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { id: 'instructor-courses', label: 'My Courses', icon: Icons.courses },
  { id: 'instructor-create-course', label: 'Create Course', icon: Icons.create },
  { id: 'instructor-grading', label: 'Grading', icon: Icons.grading },
  { id: 'instructor-quiz-builder', label: 'Quiz Builder', icon: Icons.quiz },
  { id: 'instructor-analytics', label: 'Analytics', icon: Icons.analytics },
  { id: 'instructor-discussions', label: 'Discussions', icon: Icons.discussions },
  { id: 'instructor-messages', label: 'Messages', icon: Icons.messages },
  { id: 'instructor-notifications', label: 'Notifications', icon: Icons.notifications },
  { id: 'instructor-profile', label: 'Profile & Settings', icon: Icons.profile },
];

const adminNav: { id: Route; label: string; icon: ReactNode }[] = [
  { id: 'admin-dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { id: 'admin-users', label: 'User Management', icon: Icons.users },
  { id: 'admin-courses', label: 'Courses', icon: Icons.courses },
  { id: 'admin-categories', label: 'Categories', icon: Icons.categories },
  { id: 'admin-reports', label: 'Reports', icon: Icons.reports },
  { id: 'admin-analytics', label: 'Analytics', icon: Icons.analytics },
  { id: 'admin-notifications', label: 'Notifications', icon: Icons.notifications },
  { id: 'admin-logs', label: 'Activity Logs', icon: Icons.logs },
  { id: 'admin-backup', label: 'Backup & Recovery', icon: Icons.backup },
  { id: 'admin-settings', label: 'Settings', icon: Icons.settings },
];

// ── Sidebar ──────────────────────────────────────────────────────────────

function Sidebar({ collapsed, onToggle, mobileOpen, onNavigate }: { collapsed: boolean; onToggle: () => void; mobileOpen: boolean; onNavigate: () => void }) {
  const { currentUser, route, navigate, logout, notifications } = useApp();
  if (!currentUser) return null;

  const navItems = currentUser.role === 'student' ? studentNav : currentUser.role === 'instructor' ? instructorNav : adminNav;
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  return (
    <aside className={`fixed left-0 top-0 h-full z-40 flex flex-col bg-[#0d1628] border-r border-[rgba(255,255,255,0.07)] transition-all duration-300 w-60 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'md:w-16' : 'md:w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(255,255,255,0.07)] h-16">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-display font-bold text-sm">C</span>
        </div>
        {!collapsed && <span className="font-display font-bold text-[#f0f4ff] text-lg tracking-tight">CloudLearn</span>}
        <button onClick={onToggle} className="ml-auto text-[#4a5a7a] hover:text-[#f0f4ff] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={collapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'}/>
          </svg>
        </button>
      </div>

      {/* Role indicator */}
      {!collapsed && (
        <div className="px-4 py-2 border-b border-[rgba(255,255,255,0.07)]">
          <div className="text-xs text-[#4a5a7a] uppercase tracking-wider font-mono">
            {currentUser.role === 'student' ? '🎓 Student' : currentUser.role === 'instructor' ? '👨‍🏫 Instructor' : '⚙️ Administrator'}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(item => {
          const isActive = route === item.id;
          const isNotif = item.id.endsWith('-notifications') && unreadNotifs > 0;
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.id); onNavigate(); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all text-sm relative group ${isActive ? 'text-white bg-blue-600/15 border-r-2 border-blue-500' : 'text-[#6b7fa8] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.04)]'}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
              {isNotif && !collapsed && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unreadNotifs}</span>
              )}
              {isNotif && collapsed && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-[#0d1628] border border-[rgba(255,255,255,0.1)] rounded text-xs text-[#f0f4ff] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-[rgba(255,255,255,0.07)] p-3 flex items-center gap-3">
        <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#f0f4ff] truncate">{currentUser.name}</div>
              <div className="text-xs text-[#4a5a7a] truncate">{currentUser.email}</div>
            </div>
            <button onClick={() => { void logout(); }} className="text-[#4a5a7a] hover:text-red-400 transition-colors" title="Logout">
              {Icons.logout}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

// ── Header ──────────────────────────────────────────────────────────────

function Header({ sidebarCollapsed, onMenuClick }: { sidebarCollapsed: boolean; onMenuClick: () => void }) {
  const { currentUser, route, navigate, notifications } = useApp();
  if (!currentUser) return null;

  const unread = notifications.filter(n => !n.isRead).length;

  const routeLabels: Partial<Record<Route, string>> = {
    'student-dashboard': 'Dashboard', 'student-my-courses': 'My Courses', 'student-learn': 'Course Viewer',
    'student-assignments': 'Assignments', 'student-quiz': 'Quizzes & Exams', 'student-quiz-take': 'Taking Quiz',
    'student-progress': 'My Progress', 'student-discussions': 'Discussions', 'student-messages': 'Messages',
    'student-notifications': 'Notifications', 'student-profile': 'Profile & Settings',
    'instructor-notifications': 'Notifications', 'admin-notifications': 'Notifications', 'instructor-students': 'Student Management',
    'instructor-dashboard': 'Dashboard', 'instructor-courses': 'My Courses',
    'instructor-create-course': 'Create Course', 'instructor-edit-course': 'Edit Course',
    'instructor-grading': 'Grading', 'instructor-quiz-builder': 'Quiz Builder',
    'instructor-analytics': 'Analytics', 'instructor-discussions': 'Discussions',
    'instructor-messages': 'Messages', 'instructor-profile': 'Profile',
    'admin-dashboard': 'Dashboard', 'admin-users': 'User Management',
    'admin-courses': 'Course Management', 'admin-categories': 'Categories',
    'admin-reports': 'Reports', 'admin-analytics': 'Analytics',
    'admin-logs': 'Activity Logs', 'admin-backup': 'Backup & Recovery',
    'admin-settings': 'System Settings',
  };

  return (
    <header className={`fixed top-0 right-0 left-0 ${sidebarCollapsed ? 'md:left-16' : 'md:left-60'} h-16 z-20 flex items-center justify-between px-4 gap-4 bg-[#0b1120]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.07)] transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <button className="md:hidden text-[#6b7fa8] hover:text-white p-1" onClick={onMenuClick} aria-label="Open menu">{Icons.menu}</button>
        <h1 className="font-display font-bold text-[#f0f4ff] text-lg truncate">{routeLabels[route] || 'CloudLearn'}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`${currentUser.role}-notifications` as Route)}
          aria-label="Notifications"
          className="relative text-[#6b7fa8] hover:text-white transition-colors p-2"
        >
          {Icons.notifications}
          {unread > 0 && <span className="absolute top-0.5 right-0 bg-red-500 text-white text-[10px] leading-none rounded-full px-1 py-0.5 min-w-[16px] text-center">{unread > 99 ? '99+' : unread}</span>}
        </button>
        <button
          onClick={() => navigate(currentUser.role === 'student' ? 'student-profile' : currentUser.role === 'instructor' ? 'instructor-profile' : 'admin-settings')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Avatar src={currentUser.avatar} name={currentUser.name} size={32} />
        </button>
      </div>
    </header>
  );
}

// ── Dashboard Layout ──────────────────────────────────────────────────────

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { currentUser, dataReady, navigate, route } = useApp();
  const profileRoute = `${currentUser?.role || 'student'}-${currentUser?.role === 'admin' ? 'settings' : 'profile'}` as Route;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0b1120]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
      <Header sidebarCollapsed={collapsed} onMenuClick={() => { setCollapsed(false); setMobileOpen(o => !o); }} />

      <main className={`pt-16 min-h-screen transition-all duration-300 pl-0 ${collapsed ? 'md:pl-16' : 'md:pl-60'}`}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto min-w-0">
          {currentUser?.mustChangePassword && (
            <div role="alert" className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-300 flex flex-wrap items-center gap-3">
              <span>You are using a temporary password. Please set a new one.</span>
              {route !== profileRoute && <button onClick={() => navigate(profileRoute)} className="underline hover:text-amber-200">Change password</button>}
            </div>
          )}
          {!dataReady ? <div className="py-16 text-center text-[#6b7fa8]" role="status">Loading your data…</div> : children}
        </div>
      </main>
    </div>
  );
}

// ── Public Layout ──────────────────────────────────────────────────────────

export function PublicLayout({ children }: { children: ReactNode }) {
  const { navigate, currentUser } = useApp();

  return (
    <div className="min-h-screen bg-[#0b1120]">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0b1120]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.07)]">
        <button onClick={() => navigate('landing')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-bold text-[#f0f4ff] text-lg">CloudLearn</span>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm text-[#6b7fa8]">
          <button onClick={() => navigate('courses')} className="hover:text-white transition-colors">Courses</button>
          <button onClick={() => navigate('landing')} className="hover:text-white transition-colors">About</button>
        </nav>
        <div className="flex items-center gap-3">
          {currentUser ? (
            <button
              onClick={() => navigate(currentUser.role === 'student' ? 'student-dashboard' : currentUser.role === 'instructor' ? 'instructor-dashboard' : 'admin-dashboard')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate('login')} className="text-sm text-[#a0b4d0] hover:text-white transition-colors">Sign in</button>
              <button onClick={() => navigate('register')} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors">Get started</button>
            </>
          )}
        </div>
      </header>
      <main className="pt-16">{children}</main>
    </div>
  );
}
