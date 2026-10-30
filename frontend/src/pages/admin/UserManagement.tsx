import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, SearchInput, Modal, Field, Input, Select, Tabs, SectionHeader, ConfirmDialog } from '../../components/UI';
import type { User } from '../../types';

export default function UserManagement() {
  const { users, currentUser, setUserRole, toggleUserActive, deleteUser, createUser, dataReady } = useApp();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'student' | 'instructor' | 'admin'>('student');

  const filtered = users.filter(u => {
    if (tab !== 'all' && u.role !== tab) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const roleCounts = {
    all: users.length,
    student: users.filter(u => u.role === 'student').length,
    instructor: users.filter(u => u.role === 'instructor').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  const [editRole, setEditRole] = useState<'student' | 'instructor' | 'admin'>('student');

  const openEdit = (u: User) => {
    setEditUser(u); setEditRole(u.role);
  };

  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [tempPw, setTempPw] = useState<{ email: string; password: string } | null>(null);

  const handleSave = async () => {
    if (!editUser) return;
    if (editRole !== editUser.role) { setSaving(true); await setUserRole(editUser.id, editRole); setSaving(false); }
    setEditUser(null);
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim() || saving) return;
    setSaving(true); setAddError('');
    const r = await createUser(newName.trim(), newEmail.trim(), newRole);
    setSaving(false);
    if (!r.ok) { setAddError(r.error || 'Could not create the user'); return; } // keep the form open with the server's reason
    setAddModal(false);
    setTempPw({ email: newEmail.trim(), password: r.temporaryPassword || '' });
    setNewName(''); setNewEmail(''); setNewRole('student');
  };

  return (
    <DashboardLayout>
      <SectionHeader
        title="User Management"
        description={`${users.length} total users`}
        action={<Button onClick={() => setAddModal(true)}>+ Add User</Button>}
      />

      <div className="flex flex-wrap items-center gap-4 mb-5">
        <Tabs tabs={[
          { id: 'all', label: 'All', count: roleCounts.all },
          { id: 'student', label: 'Students', count: roleCounts.student },
          { id: 'instructor', label: 'Instructors', count: roleCounts.instructor },
          { id: 'admin', label: 'Admins', count: roleCounts.admin },
        ]} active={tab} onChange={setTab} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email..." className="flex-1 min-w-48" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)]">
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#6b7fa8] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar} name={u.name} size={32} />
                      <div>
                        <div className="font-medium text-[#f0f4ff]">{u.name}</div>
                        <div className="text-xs text-[#4a5a7a]">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === 'student' ? 'blue' : u.role === 'instructor' ? 'yellow' : 'purple'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[#6b7fa8]">{u.joinedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button size="xs" variant="ghost" onClick={() => openEdit(u)}>Change role</Button>
                      <Button size="xs" variant="ghost" disabled={u.id === currentUser?.id} onClick={() => toggleUserActive(u.id)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="xs" variant="danger" disabled={u.id === currentUser?.id} onClick={() => setDeleteConfirm(u.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#4a5a7a]">{dataReady ? 'No users found' : 'Loading…'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Change role">
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editUser.avatar} name={editUser.name} size={48} />
              <div>
                <div className="font-medium text-[#f0f4ff]">{editUser.name}</div>
                <div className="text-xs text-[#4a5a7a]">{editUser.email}</div>
              </div>
            </div>
            <Field label="Role" required>
              <Select value={editRole} onChange={e => setEditRole(e.target.value as any)}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <p className="text-xs text-[#6b7fa8]">Changing a role signs the user out of all devices. Instructors keep ownership of their courses.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || editRole === editUser.role}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setAddError(''); }} title="Add New User">
        <div className="space-y-4">
          <Field label="Full Name" required>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="John Smith" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="john@example.com" />
          </Field>
          <Field label="Role" required>
            <Select value={newRole} onChange={e => setNewRole(e.target.value as any)}>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>
          {addError && <div role="alert" className="text-sm text-red-300">{addError}</div>}
          <p className="text-xs text-[#6b7fa8]">A temporary password is generated and shown once. The user must change it at first sign-in.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => { setAddModal(false); setAddError(''); }}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || !newEmail.trim() || saving}>{saving ? 'Creating…' : 'Create User'}</Button>
          </div>
        </div>
      </Modal>

      {/* One-time temporary password */}
      <Modal open={!!tempPw} onClose={() => setTempPw(null)} title="User created">
        {tempPw && (
          <div className="space-y-4">
            <p className="text-sm text-[#a0b4d0]">Give these sign-in details to <span className="text-[#f0f4ff]">{tempPw.email}</span>. The password is shown <strong>only once</strong> and cannot be retrieved later.</p>
            <div className="p-3 rounded-lg bg-[#0b1120] border border-[rgba(255,255,255,0.1)] font-mono text-lg text-center text-[#f0f4ff] select-all" data-testid="temp-password">{tempPw.password}</div>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(tempPw.password).catch(() => {})}>Copy</Button>
              <Button onClick={() => setTempPw(null)}>I have saved it</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { deleteUser(deleteConfirm!); setDeleteConfirm(null); }}
        title="Delete User"
        message="Are you sure you want to permanently delete this user? This action cannot be undone and all their data will be lost."
        confirmLabel="Delete User"
        variant="danger"
      />
    </DashboardLayout>
  );
}
