import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, SearchInput, Modal, Field, Input, Select, Tabs, SectionHeader, ConfirmDialog } from '../../components/UI';
import type { User } from '../../data';

export default function UserManagement() {
  const { users, updateUser, toggleUserActive, deleteUser, createUser } = useApp();
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

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'student' | 'instructor' | 'admin'>('student');
  const [editLocation, setEditLocation] = useState('');

  const openEdit = (u: User) => {
    setEditUser(u); setEditName(u.name); setEditRole(u.role); setEditLocation(u.location);
  };

  const handleSave = () => {
    if (!editUser) return;
    updateUser(editUser.id, { name: editName, role: editRole, location: editLocation });
    setEditUser(null);
  };

  const handleAdd = () => {
    if (!newName || !newEmail) return;
    if (!createUser(newName.trim(), newEmail.trim(), newRole)) return;
    setAddModal(false);
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
                      <Button size="xs" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                      <Button size="xs" variant="ghost" onClick={() => toggleUserActive(u.id)}>
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="xs" variant="danger" onClick={() => setDeleteConfirm(u.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#4a5a7a]">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={editUser.avatar} name={editUser.name} size={48} />
              <div>
                <div className="font-medium text-[#f0f4ff]">{editUser.name}</div>
                <div className="text-xs text-[#4a5a7a]">{editUser.email}</div>
              </div>
            </div>
            <Field label="Full Name" required>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </Field>
            <Field label="Role" required>
              <Select value={editRole} onChange={e => setEditRole(e.target.value as any)}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Administrator</option>
              </Select>
            </Field>
            <Field label="Location">
              <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="City, Country" />
            </Field>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add New User">
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
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName || !newEmail}>Create User</Button>
          </div>
        </div>
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
