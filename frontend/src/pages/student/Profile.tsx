import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Field, Input, Textarea, Avatar, Badge, SectionHeader } from '../../components/UI';

export default function Profile() {
  const { currentUser, updateProfile, changePassword, logout, addToast } = useApp();
  if (!currentUser) return null;

  const [tab, setTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [phone, setPhone] = useState(currentUser.phone);
  const [location, setLocation] = useState(currentUser.location);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    'Assignment reminders': true, 'Grade notifications': true, 'New course content': true,
    'Discussion replies': false, 'Direct messages': true, 'Course announcements': true,
  });

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await updateProfile({ name: name.trim(), bio, phone, location });
    setSaving(false);
  };

  const handlePwChange = async () => {
    setPwError('');
    if (!currentPw) { setPwError('Enter your current password'); return; }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    const r = await changePassword(currentPw, newPw);
    if (!r.ok) { setPwError(r.error || 'Could not change password'); return; }
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
  };

  const tabs = ['profile', 'security', 'notifications'] as const;

  return (
    <DashboardLayout>
      <SectionHeader title="Profile & Settings" />

      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-[#6b7fa8] hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar panel */}
          <Card className="p-6 flex flex-col items-center text-center">
            <Avatar src={currentUser.avatar} name={currentUser.name} size={96} />
            <h3 className="font-display font-bold text-[#f0f4ff] mt-4">{currentUser.name}</h3>
            <p className="text-sm text-[#6b7fa8] capitalize">{currentUser.role}</p>
            <Badge variant="green" className="mt-2">Active</Badge>
            <div className="mt-4 text-xs text-[#4a5a7a] space-y-1">
              <div>📧 {currentUser.email}</div>
              <div>📅 Joined {currentUser.joinedAt}</div>
              {currentUser.location && <div>📍 {currentUser.location}</div>}
            </div>
          </Card>

          {/* Edit form */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-5">
              <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={currentUser.email} disabled className="opacity-60" />
                </Field>
                <Field label="Phone">
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
                </Field>
                <Field label="Location">
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Nigeria" />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Bio">
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} placeholder="Tell us a bit about yourself..." />
                </Field>
              </div>
              <div className="mt-4 flex gap-3">
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
                <Button variant="secondary" onClick={() => { setName(currentUser.name); setBio(currentUser.bio); }}>Reset</Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <Card className="p-6 max-w-lg">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Change Password</h3>
          <div className="space-y-4">
            <Field label="Current Password" required>
              <Input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="New Password" required>
              <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" minLength={6} />
            </Field>
            <Field label="Confirm New Password" required>
              <Input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
            </Field>
            {pwError && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{pwError}</div>}
            <Button onClick={handlePwChange}>Update Password</Button>
          </div>

          <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.07)]">
            <h4 className="font-semibold text-[#f0f4ff] mb-2">Session</h4>
            <p className="text-sm text-[#6b7fa8] mb-4">End your session on this device.</p>
            <Button variant="danger" onClick={logout}>Sign Out</Button>
          </div>
        </Card>
      )}

      {tab === 'notifications' && (
        <Card className="p-6 max-w-lg">
          <h3 className="font-display font-bold text-[#f0f4ff] mb-4">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { label: 'Assignment reminders', desc: 'Get notified before assignments are due' },
              { label: 'Grade notifications', desc: 'When your work is graded' },
              { label: 'New course content', desc: 'When instructors add new lessons' },
              { label: 'Discussion replies', desc: 'When someone replies to your posts' },
              { label: 'Direct messages', desc: 'When you receive new messages' },
              { label: 'Course announcements', desc: 'System-wide announcements' },
            ].map(pref => (
              <div key={pref.label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.07)] last:border-0">
                <div>
                  <div className="text-sm font-medium text-[#f0f4ff]">{pref.label}</div>
                  <div className="text-xs text-[#4a5a7a]">{pref.desc}</div>
                </div>
                <button
                  role="switch" aria-checked={prefs[pref.label]} aria-label={pref.label}
                  className={`w-10 h-5 rounded-full transition-colors relative ${prefs[pref.label] ? 'bg-blue-600' : 'bg-[#1a2540]'}`}
                  onClick={() => setPrefs(p => ({ ...p, [pref.label]: !p[pref.label] }))}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${prefs[pref.label] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <Button className="mt-6" onClick={() => addToast('Preferences saved for this session', 'info')}>Save Preferences</Button>
        </Card>
      )}
    </DashboardLayout>
  );
}
