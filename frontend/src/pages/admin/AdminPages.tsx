import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, SearchInput, SectionHeader, StatCard, Tabs, Field, Input, Textarea, Spinner, EmptyState, ConfirmDialog } from '../../components/UI';
import { CATEGORIES } from '../../lib/constants';
import { api, errorMessage } from '../../api';

// ── Course Management ──────────────────────────────────────────────────────

export function AdminCourses() {
  const { courses, toggleCoursePublished } = useApp();
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
                const enrolled = course.enrolledCount;
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
                        <Avatar name={course.instructorName} size={24} />
                        <span className="text-[#a0b4d0]">{course.instructorName}</span>
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
// The category list is fixed by the platform (lib/constants); the admin sees how courses are spread across it.

export function AdminCategories() {
  const { courses } = useApp();
  return (
    <DashboardLayout>
      <SectionHeader title="Categories" description="Course categories available to instructors" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Icon', 'Category', 'Courses', 'Published'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map(cat => {
                const inCat = courses.filter(c => c.category === cat.name);
                return (
                  <tr key={cat.id} className="border-b border-[rgba(255,255,255,0.04)]">
                    <td className="px-4 py-3 text-2xl">{cat.icon}</td>
                    <td className="px-4 py-3 font-medium text-[#f0f4ff]">{cat.name}</td>
                    <td className="px-4 py-3 text-[#6b7fa8]">{inCat.length}</td>
                    <td className="px-4 py-3 text-[#6b7fa8]">{inCat.filter(c => c.isPublished).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────

interface Report { report: string; title: string; generatedAt: string; summary: Record<string, unknown>; columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }
const REPORTS = [
  { id: 'users', label: 'Users' },
  { id: 'course-performance', label: 'Course Performance' },
  { id: 'assessment-results', label: 'Assessment Results' },
];
const humanize = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function AdminReports() {
  const [tab, setTab] = useState('users');
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true); setError(''); setData(null);
    api.get<Report>(`/reports/${tab}`)
      .then(r => { if (live) setData(r); })
      .catch(e => { if (live) setError(errorMessage(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tab]);

  return (
    <DashboardLayout>
      <SectionHeader title="Reports" description="Generated from live platform data. Download any report as CSV."
        action={<a href={`/api/reports/${tab}?format=csv`} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white" download>⬇ Download CSV</a>} />
      <div className="mb-5"><Tabs tabs={REPORTS} active={tab} onChange={setTab} /></div>

      {loading && <div className="flex justify-center py-16" role="status"><Spinner size={28} /></div>}
      {error && <div role="alert" className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">{error}</div>}

      {data && (
        <>
          {Object.keys(data.summary || {}).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {Object.entries(data.summary).map(([k, v]) => <StatCard key={k} label={humanize(k)} value={show(v)} icon="📊" color="blue" />)}
            </div>
          )}
          <Card>
            <div className="p-4 border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between">
              <h3 className="font-display font-bold text-[#f0f4ff]">{data.title}</h3>
              <span className="text-xs text-[#4a5a7a]">Generated {new Date(data.generatedAt).toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.07)]">
                    {data.columns.map(c => <th key={c.key} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide whitespace-nowrap">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                      {data.columns.map(c => <td key={c.key} className="px-4 py-2.5 text-[#a0b4d0] whitespace-nowrap">{show(r[c.key])}</td>)}
                    </tr>
                  ))}
                  {data.rows.length === 0 && <tr><td colSpan={data.columns.length} className="px-4 py-8 text-center text-[#4a5a7a]">No data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}

// ── Activity Logs ──────────────────────────────────────────────────────────

export interface LogRow { id: number; at: string; user: string | null; action: string; detail: string | null; ip: string | null; status: string }
const PAGE = 50;

export function ActivityLogs() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // debounce the search box so we do not query on every keystroke
  useEffect(() => { const t = setTimeout(() => { setQ(search); setOffset(0); }, 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError('');
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
    if (filter !== 'all') p.set('status', filter);
    if (q) p.set('q', q);
    api.get(`/admin/activity-logs?${p}`)
      .then(r => { if (live) { setLogs(r.logs); setTotal(r.total); } })
      .catch(e => { if (live) setError(errorMessage(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [filter, q, offset]);

  return (
    <DashboardLayout>
      <SectionHeader title="Activity Logs" description={`${total} recorded events`} />

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="flex-1 min-w-48" />
        <select value={filter} onChange={e => { setFilter(e.target.value); setOffset(0); }} aria-label="Filter by status"
          className="px-3 py-2 bg-[#111827] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
          <option value="all">All Events</option>
          <option value="success">Successful</option>
          <option value="failed">Failed / Security</option>
        </select>
      </div>

      {error && <div role="alert" className="mb-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">{error}</div>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['Timestamp', 'User', 'Action', 'Detail', 'IP', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                  <td className="px-4 py-3 font-mono text-xs text-[#6b7fa8] whitespace-nowrap">{l.at.replace('T', ' ').slice(0, 19)}</td>
                  <td className="px-4 py-3 text-[#a0b4d0]">{l.user || '—'}</td>
                  <td className="px-4 py-3 text-[#f0f4ff]">{l.action}</td>
                  <td className="px-4 py-3 text-[#6b7fa8]">{l.detail || ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#4a5a7a]">{l.ip}</td>
                  <td className="px-4 py-3"><Badge variant={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge></td>
                </tr>
              ))}
              {!loading && logs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#4a5a7a]">No log entries match your filter</td></tr>}
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#4a5a7a]">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
        {total > PAGE && (
          <div className="p-3 flex items-center justify-between border-t border-[rgba(255,255,255,0.07)] text-sm text-[#6b7fa8]">
            <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
            <div className="flex gap-2">
              <Button size="xs" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Previous</Button>
              <Button size="xs" variant="secondary" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}

// ── Backup & Recovery ──────────────────────────────────────────────────────

interface BackupInfo { name: string; createdAt: string; kind: string; sizeBytes: number; users: number; courses: number }
const fmtBytes = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export function BackupRecovery() {
  const { addToast, logout } = useApp();
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupInfo | null>(null);

  const load = useCallback(async () => {
    try { setBackups((await api.get('/admin/backups')).backups); setError(''); } catch (e) { setError(errorMessage(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try { await api.post('/admin/backups'); addToast('Backup created'); await load(); } catch (e) { addToast(errorMessage(e), 'error'); } finally { setBusy(false); }
  };
  const restore = async () => {
    if (!restoreTarget) return;
    setBusy(true);
    try {
      await api.post(`/admin/backups/${restoreTarget.name}/restore`, { confirm: true });
      addToast('Backup restored. Everyone has been signed out; please sign in again.', 'success');
      setRestoreTarget(null);
      await logout();
    } catch (e) { addToast(errorMessage(e), 'error'); setRestoreTarget(null); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    try { await api.del(`/admin/backups/${deleteTarget.name}`); addToast('Backup deleted'); await load(); } catch (e) { addToast(errorMessage(e), 'error'); }
    setDeleteTarget(null);
  };

  const latest = backups[0];
  const totalBytes = backups.reduce((a, b) => a + b.sizeBytes, 0);

  return (
    <DashboardLayout>
      <SectionHeader title="Backup & Recovery" description="Snapshots of the database and uploaded files"
        action={<Button onClick={create} disabled={busy}>{busy ? 'Working…' : '+ Create backup'}</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Last Backup" value={latest ? new Date(latest.createdAt).toLocaleDateString() : 'None'} icon="💾" color="green" sub={latest ? new Date(latest.createdAt).toLocaleTimeString() : 'Create one now'} />
        <StatCard label="Total Backups" value={backups.length} icon="📦" color="blue" />
        <StatCard label="Storage Used" value={fmtBytes(totalBytes)} icon="☁️" color="purple" />
      </div>

      {error && <div role="alert" className="mb-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300">{error}</div>}

      <Card>
        <div className="p-4 border-b border-[rgba(255,255,255,0.07)]"><h3 className="font-display font-bold text-[#f0f4ff]">Backup History</h3></div>
        {loading ? <div className="flex justify-center py-10" role="status"><Spinner size={24} /></div> : backups.length === 0 ? (
          <EmptyState icon="💾" title="No backups yet" description="Create a backup before making large changes." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.07)]">
                  {['Created', 'Type', 'Size', 'Users', 'Courses', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.name} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="px-4 py-3 font-mono text-xs text-[#a0b4d0]">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={b.kind === 'manual' ? 'blue' : 'gray'}>{b.kind === 'pre-restore' ? 'Safety (pre-restore)' : b.kind}</Badge></td>
                    <td className="px-4 py-3 text-[#a0b4d0]">{fmtBytes(b.sizeBytes)}</td>
                    <td className="px-4 py-3 text-[#6b7fa8]">{b.users}</td>
                    <td className="px-4 py-3 text-[#6b7fa8]">{b.courses}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="xs" variant="ghost" disabled={busy} onClick={() => setRestoreTarget(b)}>Restore</Button>
                        <Button size="xs" variant="ghost" disabled={busy} onClick={() => setDeleteTarget(b)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!restoreTarget} onClose={() => setRestoreTarget(null)} onConfirm={restore} variant="danger" confirmLabel="Restore and sign everyone out"
        title="Restore this backup?"
        message={`This replaces ALL current data (users, courses, grades, uploads) with the backup from ${restoreTarget ? new Date(restoreTarget.createdAt).toLocaleString() : ''}. Anything changed since then is lost, and every user, including you, is signed out. A safety backup of the current state is taken first.`} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={remove} confirmLabel="Delete backup"
        title="Delete this backup?" message="The backup files are permanently removed." />
    </DashboardLayout>
  );
}

// ── System Settings ──────────────────────────────────────────────────────────
// Read-only: there are no editable platform settings in the MVP; this reports what is actually enforced.

export function SystemSettings() {
  return (
    <DashboardLayout>
      <SectionHeader title="System" description="Security controls enforced by the server" />
      <Card className="p-5 max-w-lg">
        <div className="space-y-4 text-sm">
          {[
            ['Role-based access control', 'Every API route checks the signed-in role'],
            ['Password hashing', 'bcrypt; passwords are never stored or returned'],
            ['Login throttling', '5 failed attempts per account and address in 15 minutes'],
            ['Server-side sessions', 'httpOnly cookie, revoked on deactivation and password change'],
            ['Upload limits', '10 MB per file, allowed types only'],
          ].map(([label, note]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(255,255,255,0.07)]">
              <div><div className="text-[#f0f4ff]">{label}</div><div className="text-xs text-[#4a5a7a]">{note}</div></div>
              <Badge variant="green">Active</Badge>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}

// ── Instructor Profile ──────────────────────────────────────────────────────

export function InstructorProfile() {
  const { currentUser, updateProfile, changePassword } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [location, setLocation] = useState(currentUser?.location || '');
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!currentUser) return null;

  const savePassword = async () => {
    const r = await changePassword(cur, next);
    setPwMsg({ ok: r.ok, text: r.ok ? 'Password updated.' : r.error || 'Could not update password' });
    if (r.ok) { setCur(''); setNext(''); }
  };

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
              <Badge variant="yellow" className="mt-1">{currentUser.role === 'admin' ? 'Administrator' : 'Instructor'}</Badge>
            </div>
          </div>
          <div className="space-y-3">
            <Field label="Name"><Input value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Bio"><Textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={phone} onChange={e => setPhone(e.target.value)} /></Field>
              <Field label="Location"><Input value={location} onChange={e => setLocation(e.target.value)} /></Field>
            </div>
            <Button onClick={() => updateProfile({ name, bio, phone, location })} disabled={!name.trim()}>Save Changes</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Change Password</h3>
          <div className="space-y-3">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} /></Field>
            <Field label="New password" hint="6 to 72 characters"><Input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} /></Field>
            {pwMsg && <div role={pwMsg.ok ? 'status' : 'alert'} className={`text-sm ${pwMsg.ok ? 'text-emerald-400' : 'text-red-300'}`}>{pwMsg.text}</div>}
            <Button onClick={savePassword} disabled={!cur || next.length < 6}>Update password</Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
