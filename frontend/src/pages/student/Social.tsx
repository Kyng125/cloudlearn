import { useState } from 'react';
import { useApp } from '../../context';
import { DashboardLayout } from '../../components/Layout';
import { Card, Button, Badge, Avatar, Modal, Field, Input, Textarea, SearchInput, SectionHeader, EmptyState } from '../../components/UI';

// ── Discussions ──────────────────────────────────────────────────────────

export function Discussions() {
  const { currentUser, discussions, enrollments, courses, postDiscussion, replyToDiscussion, getCourseById, getUserById, dataReady } = useApp();
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newThreadModal, setNewThreadModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [search, setSearch] = useState('');
  if (!currentUser) return null;
  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;

  // Students see forums of courses they are enrolled in; instructors see those of courses they teach.
  const myEnrollments = enrollments.filter(e => e.studentId === currentUser.id);
  const courseIds = currentUser.role === 'instructor'
    ? courses.filter(c => c.instructorId === currentUser.id).map(c => c.id)
    : myEnrollments.map(e => e.courseId);
  const myDiscussions = discussions.filter(d => courseIds.includes(d.courseId));
  const filtered = myDiscussions.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.body.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const activeThread = discussions.find(d => d.id === selectedThread);

  const handlePost = async () => {
    if (!newTitle.trim() || !newBody.trim() || !selectedCourse) return;
    await postDiscussion(selectedCourse, newTitle, newBody);
    setNewThreadModal(false);
    setNewTitle(''); setNewBody(''); setSelectedCourse('');
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    const text = replyText;
    setReplyText('');
    await replyToDiscussion(selectedThread, text);
  };

  if (selectedThread && activeThread) {
    const course = getCourseById(activeThread.courseId);
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setSelectedThread(null)} className="text-[#6b7fa8] hover:text-white text-sm transition-colors">← Back to Discussions</button>
        </div>
        <Card className="p-5 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <Avatar src={getUserById(activeThread.authorId)?.avatar} name={getUserById(activeThread.authorId)?.name || ''} size={40} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-display font-bold text-xl text-[#f0f4ff]">{activeThread.title}</h2>
              </div>
              <p className="text-xs text-[#4a5a7a]">{getUserById(activeThread.authorId)?.name} · {new Date(activeThread.createdAt).toLocaleDateString()} · {course?.title}</p>
            </div>
          </div>
          <p className="text-[#a0b4d0] leading-relaxed">{activeThread.body}</p>
        </Card>

        <h3 className="font-semibold text-[#f0f4ff] mb-3">{activeThread.replies.length} Replies</h3>
        <div className="space-y-4 mb-5">
          {activeThread.replies.map(r => {
            const author = getUserById(r.authorId);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar src={author?.avatar} name={author?.name || ''} size={32} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#f0f4ff]">{author?.name}</span>
                      {author?.role === 'instructor' && <Badge variant="blue">Instructor</Badge>}
                      <span className="text-xs text-[#4a5a7a]">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-[#a0b4d0] leading-relaxed">{r.body}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="p-4">
          <h4 className="text-sm font-medium text-[#f0f4ff] mb-3">Write a reply</h4>
          <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Share your thoughts..." className="mb-3" />
          <Button size="sm" onClick={handleReply} disabled={!replyText.trim()}>Post Reply</Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SectionHeader
        title="Discussions"
        description={currentUser.role === 'instructor' ? 'Forums for the courses you teach' : 'Course discussion forums'}
        action={<Button size="sm" onClick={() => setNewThreadModal(true)}>+ New Thread</Button>}
      />
      <div className="mb-5">
        <SearchInput value={search} onChange={setSearch} placeholder="Search discussions..." />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="💬" title="No discussions yet" description="Start a conversation with your classmates"
          action={<Button onClick={() => setNewThreadModal(true)}>Start Discussion</Button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map(thread => {
            const author = getUserById(thread.authorId);
            const course = getCourseById(thread.courseId);
            return (
              <Card key={thread.id} className="p-4 cursor-pointer" onClick={() => setSelectedThread(thread.id)}>
                <div className="flex items-start gap-3">
                  <Avatar src={author?.avatar} name={author?.name || ''} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-[#f0f4ff] truncate">{thread.title}</h3>
                    </div>
                    <p className="text-xs text-[#6b7fa8] mb-2 line-clamp-1">{thread.body}</p>
                    <div className="flex items-center gap-3 text-xs text-[#4a5a7a]">
                      <span>{author?.name}</span>
                      <span>·</span>
                      <span className="text-blue-400">{course?.title}</span>
                      <span>·</span>
                      <span>{thread.replies.length} replies</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={newThreadModal} onClose={() => setNewThreadModal(false)} title="New Discussion Thread" size="lg">
        <div className="space-y-4">
          <Field label="Course" required>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
              <option value="">Select a course...</option>
              {courseIds.map(id => {
                const c = getCourseById(id);
                return c ? <option key={id} value={id}>{c.title}</option> : null;
              })}
            </select>
          </Field>
          <Field label="Title" required>
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What's your question or topic?" />
          </Field>
          <Field label="Body" required>
            <Textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={5} placeholder="Describe your question or topic in detail..." />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setNewThreadModal(false)}>Cancel</Button>
            <Button onClick={handlePost} disabled={!newTitle.trim() || !newBody.trim() || !selectedCourse}>Post Thread</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────

export function Messages() {
  const { currentUser, messages, sendMessage, markMessageRead, contacts, getUserById, dataReady } = useApp();
  const [activeMsg, setActiveMsg] = useState<string | null>(null);
  const [composeModal, setComposeModal] = useState(false);
  const [toId, setToId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  if (!currentUser) return null;
  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;

  const inbox = messages.filter(m => m.toId === currentUser.id).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const sent = messages.filter(m => m.fromId === currentUser.id).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  const displayed = tab === 'inbox' ? inbox : sent;

  const activeMessage = messages.find(m => m.id === activeMsg);
  if (activeMsg && activeMessage && !activeMessage.isRead && activeMessage.toId === currentUser.id) markMessageRead(activeMsg);

  const handleCompose = async () => {
    if (!toId || !subject.trim() || !body.trim()) return;
    if (await sendMessage(toId, subject, body)) {
      setComposeModal(false);
      setToId(''); setSubject(''); setBody('');
    }
  };

  return (
    <DashboardLayout>
      <SectionHeader
        title="Messages"
        description="Communicate with instructors and peers"
        action={<Button size="sm" onClick={() => setComposeModal(true)}>✏️ Compose</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <div className="flex gap-2 mb-3">
            {(['inbox', 'sent'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-[#6b7fa8] hover:text-white'}`}>
                {t === 'inbox' ? `Inbox (${inbox.filter(m => !m.isRead).length} unread)` : 'Sent'}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {displayed.length === 0 ? (
              <EmptyState icon="✉️" title="No messages" />
            ) : displayed.map(msg => {
              const other = getUserById(tab === 'inbox' ? msg.fromId : msg.toId);
              return (
                <Card key={msg.id} className={`p-3 cursor-pointer ${activeMsg === msg.id ? 'border-blue-500/50' : ''}`} onClick={() => setActiveMsg(msg.id)}>
                  <div className="flex items-start gap-2">
                    <Avatar src={other?.avatar} name={other?.name || ''} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#f0f4ff] truncate">{other?.name}</span>
                        {!msg.isRead && tab === 'inbox' && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-[#6b7fa8] truncate">{msg.subject}</p>
                      <p className="text-xs text-[#4a5a7a]">{new Date(msg.sentAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2">
          {activeMessage ? (
            <Card className="p-5">
              <h3 className="font-display font-bold text-xl text-[#f0f4ff] mb-2">{activeMessage.subject}</h3>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[rgba(255,255,255,0.07)]">
                <Avatar src={getUserById(activeMessage.fromId)?.avatar} name={getUserById(activeMessage.fromId)?.name || ''} size={36} />
                <div>
                  <p className="text-sm font-medium text-[#f0f4ff]">{getUserById(activeMessage.fromId)?.name}</p>
                  <p className="text-xs text-[#4a5a7a]">To: {getUserById(activeMessage.toId)?.name} · {new Date(activeMessage.sentAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-sm text-[#a0b4d0] leading-relaxed whitespace-pre-wrap">{activeMessage.body}</div>
              <div className="mt-5 pt-4 border-t border-[rgba(255,255,255,0.07)]">
                <Button size="sm" variant="secondary" onClick={() => { setToId(activeMessage.fromId); setSubject(`Re: ${activeMessage.subject}`); setComposeModal(true); }}>
                  ↩ Reply
                </Button>
              </div>
            </Card>
          ) : (
            <EmptyState icon="📧" title="Select a message" description="Choose a message from the list to read it" />
          )}
        </div>
      </div>

      <Modal open={composeModal} onClose={() => setComposeModal(false)} title="New Message" size="lg">
        <div className="space-y-4">
          <Field label="To" required>
            <select value={toId} onChange={e => setToId(e.target.value)}
              className="w-full px-3 py-2 bg-[#0b1120] border border-[rgba(255,255,255,0.1)] rounded-lg text-sm text-[#f0f4ff]">
              <option value="">Select recipient...</option>
              {contacts.filter(u => u.id !== currentUser.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </Field>
          <Field label="Subject" required>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." />
          </Field>
          <Field label="Message" required>
            <Textarea value={body} onChange={e => setBody(e.target.value)} rows={6} placeholder="Write your message..." />
          </Field>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setComposeModal(false)}>Cancel</Button>
            <Button onClick={handleCompose} disabled={!toId || !subject.trim() || !body.trim()}>Send Message</Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}

// ── Notifications ──────────────────────────────────────────────────────────

export function NotificationsPage() {
  const { currentUser, notifications, markNotificationRead, markAllNotificationsRead, dataReady } = useApp();
  if (!currentUser) return null;
  if (!dataReady) return <DashboardLayout><p className="text-[#6b7fa8]">Loading…</p></DashboardLayout>;

  const myNotifs = notifications.filter(n => n.userId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const unread = myNotifs.filter(n => !n.isRead).length;

  const typeIcon: Record<string, string> = { assignment: '📝', grade: '📊', message: '✉️', course: '📚', quiz: '❓', system: '⚙️' };
  const typeColor: Record<string, 'blue' | 'green' | 'yellow' | 'purple' | 'gray' | 'cyan'> = {
    assignment: 'yellow', grade: 'green', message: 'blue', course: 'cyan', quiz: 'purple', system: 'gray',
  };

  return (
    <DashboardLayout>
      <SectionHeader
        title="Notifications"
        description={`${unread} unread`}
        action={unread > 0 ? <Button size="sm" variant="ghost" onClick={markAllNotificationsRead}>Mark all read</Button> : undefined}
      />

      {myNotifs.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {myNotifs.map(n => (
            <Card key={n.id}
              className={`p-4 cursor-pointer ${!n.isRead ? 'border-blue-500/20 bg-blue-500/3' : ''}`}
              onClick={() => markNotificationRead(n.id)}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcon[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[#f0f4ff]">{n.title}</span>
                    <Badge variant={typeColor[n.type] || 'gray'}>{n.type}</Badge>
                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-[#a0b4d0]">{n.body}</p>
                  <p className="text-xs text-[#4a5a7a] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
