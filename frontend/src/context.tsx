import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { api, ApiError, errorMessage, setUnauthorizedHandler } from './api';
import { formatMinutes } from './lib/constants';
import type {
  User, Course, Module, Lesson, Material, Enrollment, Assignment, Submission, Quiz, QuizAttempt, Question,
  DiscussionThread, Message, Notification, Contact, LiveAttempt, AttemptQuestion,
} from './types';

// ── Route Types ──────────────────────────────────────────────────────────

export type Route =
  | 'landing' | 'login' | 'register' | 'forgot-password'
  | 'courses' | 'course-detail'
  // Student
  | 'student-dashboard' | 'student-my-courses' | 'student-learn' | 'student-browse'
  | 'student-assignments' | 'student-quiz' | 'student-quiz-take' | 'student-results'
  | 'student-progress' | 'student-discussions' | 'student-discussion-thread'
  | 'student-messages' | 'student-notifications' | 'student-profile' | 'student-settings'
  // Instructor
  | 'instructor-dashboard' | 'instructor-courses' | 'instructor-create-course'
  | 'instructor-edit-course' | 'instructor-students' | 'instructor-grading' | 'instructor-notifications'
  | 'instructor-quiz-builder' | 'instructor-analytics' | 'instructor-discussions'
  | 'instructor-messages' | 'instructor-profile' | 'instructor-settings'
  // Admin
  | 'admin-dashboard' | 'admin-users' | 'admin-courses' | 'admin-categories'
  | 'admin-reports' | 'admin-analytics' | 'admin-logs' | 'admin-backup'
  | 'admin-settings' | 'admin-notifications';

export interface Toast { id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }

export interface AppState {
  currentUser: User | null;
  route: Route;
  routeParams: Record<string, string>;
  users: User[];                    // administrators only; everyone else sees names through getUserById
  courses: Course[];
  enrollments: Enrollment[];
  assignments: Assignment[];
  submissions: Submission[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  discussions: DiscussionThread[];
  messages: Message[];
  notifications: Notification[];
  contacts: Contact[];
  materials: Record<string, Material[]>;
  toasts: Toast[];
  sessionChecked: boolean;          // the first /auth/me call has finished
  dataReady: boolean;               // the signed-in user's data has been loaded
}

type Result = { ok: boolean; error?: string };
type Slice = 'courses' | 'enrollments' | 'assignments' | 'quizzes' | 'social' | 'messages' | 'notifications' | 'users';

interface AppContextType extends AppState {
  navigate: (route: Route, params?: Record<string, string>) => void;
  reload: (...slices: Slice[]) => Promise<void>;
  // auth
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<Result>;
  updateProfile: (data: Partial<Pick<User, 'name' | 'bio' | 'phone' | 'location'>>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<Result>;
  // student
  enrollInCourse: (courseId: string) => Promise<void>;
  markLessonComplete: (courseId: string, lessonId: string) => Promise<void>;
  submitAssignment: (assignmentId: string, content: string, file: File) => Promise<boolean>;
  startQuizAttempt: (quizId: string) => Promise<{ attempt: LiveAttempt; questions: AttemptQuestion[]; offsetMs: number } | null>;
  saveQuizAnswers: (attemptId: string, answers: number[]) => Promise<boolean>;
  finishQuizAttempt: (attemptId: string, answers?: number[]) => Promise<LiveAttempt | null>;
  // instructor
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => Promise<boolean>;
  createCourse: (data: Partial<Course>) => Promise<Course | null>;
  updateCourse: (courseId: string, data: Partial<Pick<Course, 'title' | 'description' | 'category' | 'level' | 'thumbnail' | 'isPublished'>>) => Promise<boolean>;
  toggleCoursePublished: (courseId: string) => Promise<void>;
  deleteCourse: (courseId: string) => Promise<boolean>;
  addModule: (courseId: string, title: string) => Promise<void>;
  renameModule: (moduleId: string, title: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  addLesson: (moduleId: string, courseId: string, title: string, type: Lesson['type'], content?: string, durationMinutes?: number) => Promise<void>;
  updateLesson: (lessonId: string, data: Partial<Pick<Lesson, 'title' | 'type' | 'content' | 'durationMinutes'>>) => Promise<void>;
  deleteLesson: (lessonId: string) => Promise<void>;
  loadMaterials: (courseId: string) => Promise<void>;
  uploadMaterial: (courseId: string, file: File) => Promise<boolean>;
  deleteMaterial: (courseId: string, materialId: string) => Promise<void>;
  createQuiz: (courseId: string, data: { title: string; description?: string; durationMinutes: number; passingScore: number; isExam: boolean; questions: { text: string; options: string[]; correctIndex: number; points?: number; explanation?: string }[] }, publish: boolean) => Promise<boolean>;
  setQuizPublished: (quizId: string, published: boolean) => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
  createAssignment: (courseId: string, data: { title: string; description: string; dueDate: string; maxPoints: number }) => Promise<boolean>;
  // communication
  postDiscussion: (courseId: string, title: string, body: string) => Promise<void>;
  replyToDiscussion: (threadId: string, body: string) => Promise<void>;
  deleteDiscussion: (threadId: string) => Promise<void>;
  sendMessage: (toId: string, subject: string, body: string) => Promise<boolean>;
  markMessageRead: (msgId: string) => Promise<void>;
  markNotificationRead: (notifId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  // admin
  createUser: (name: string, email: string, role: User['role']) => Promise<{ ok: boolean; temporaryPassword?: string; error?: string }>;
  setUserRole: (userId: string, role: User['role']) => Promise<void>;
  toggleUserActive: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  // lookups (live state, never static data)
  getUserById: (id: string) => User | undefined;
  getCourseById: (id: string) => Course | undefined;
  getEnrollmentsForCourse: (courseId: string) => Enrollment[];
  getAssignmentsForCourse: (courseId: string) => Assignment[];
  getQuizzesForCourse: (courseId: string) => Quiz[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);
let toastCounter = 0;
const day = (iso: string) => (iso || '').slice(0, 10);
const homeFor = (u: User): Route => `${u.role}-dashboard` as Route;

// ── API -> front-end shape adapters ──────────────────────────────────────
const toUser = (u: any): User => ({ id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar || '', bio: u.bio || '', phone: u.phone || '', location: u.location || '', joinedAt: u.joinedAt || '', isActive: u.isActive !== false, mustChangePassword: u.mustChangePassword });
const stub = (id: string, name: string, role: User['role']): User => ({ id, name, email: '', role, avatar: '', bio: '', phone: '', location: '', joinedAt: '', isActive: true });
const toLesson = (l: any): Lesson => ({ id: l.id, moduleId: l.moduleId, title: l.title, type: l.type, content: l.content || '', duration: formatMinutes(l.durationMinutes || 0), durationMinutes: l.durationMinutes || 0, order: l.order });
const toModule = (m: any): Module => ({ id: m.id, courseId: m.courseId, title: m.title, order: m.order, lessons: (m.lessons || []).map(toLesson) });
const toCourse = (c: any, modules: Module[] = []): Course => ({
  id: c.id, title: c.title, description: c.description, instructorId: c.instructorId, instructorName: c.instructorName || '', category: c.category, level: c.level,
  duration: formatMinutes(c.durationMinutes || 0), durationMinutes: c.durationMinutes || 0, thumbnail: c.thumbnail || '', enrolledCount: c.enrolledCount || 0,
  isPublished: !!c.isPublished, createdAt: day(c.createdAt), modules,
});
const toSubmission = (s: any): Submission => ({ id: s.id, assignmentId: s.assignmentId, studentId: s.studentId, studentName: s.studentName, content: s.content || '', fileName: s.fileName, submittedAt: s.submittedAt, grade: s.grade, feedback: s.feedback, isLate: !!s.isLate, status: s.status });
const toQuiz = (q: any, questions: Question[] = []): Quiz => ({ id: q.id, courseId: q.courseId, instructorId: q.instructorId, title: q.title, description: q.description || '', duration: q.duration, passingScore: q.passingScore, isExam: !!q.isExam, isPublished: !!q.isPublished, createdAt: day(q.createdAt), questionCount: q.questionCount, totalPoints: q.totalPoints, questions });
const toAttempt = (a: any): QuizAttempt => ({ id: a.id, quizId: a.quizId, studentId: a.studentId, studentName: a.studentName, answers: a.answers || [], score: a.score, totalPoints: a.totalPoints, passed: !!a.passed, completedAt: a.completedAt, timeTaken: a.timeTaken || 0 });

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null, route: 'landing', routeParams: {}, users: [], courses: [], enrollments: [], assignments: [], submissions: [], quizzes: [],
    quizAttempts: [], discussions: [], messages: [], notifications: [], contacts: [], materials: {}, toasts: [], sessionChecked: false, dataReady: false,
  });
  const directory = useRef<Record<string, User>>({});
  const userRef = useRef<User | null>(null);
  userRef.current = state.currentUser;
  const generation = useRef(0); // bumped on sign-in/out so late responses from a previous session are ignored

  const update = (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch }));
  const navigate = useCallback((route: Route, params: Record<string, string> = {}) => { update({ route, routeParams: params }); window.scrollTo(0, 0); }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `t${++toastCounter}`;
    setState(s => ({ ...s, toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 4500);
  }, []);
  const removeToast = useCallback((id: string) => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), []);
  const fail = useCallback((e: unknown) => { addToast(errorMessage(e), 'error'); }, [addToast]);
  const learn = (id: string, name: string, role: User['role']) => { if (id && name && !directory.current[id]) directory.current[id] = stub(id, name, role); };

  // ── loaders: each fetches one slice for the current user ──
  const loaders = useCallback((u: User): Record<Slice, () => Promise<Partial<AppState>>> => {
    const staff = u.role !== 'student';
    return {
      courses: async () => {
        const list: any[] = (await api.get('/courses')).courses;
        list.forEach(c => learn(c.instructorId, c.instructorName, 'instructor'));
        const details = await Promise.all(list.map(c => api.get(`/courses/${c.id}`).then(r => r.course).catch(() => null)));
        return { courses: list.map((c, i) => toCourse(c, details[i] ? details[i].modules.map(toModule) : [])) };
      },
      enrollments: async () => {
        const enrollments: Enrollment[] = (await api.get('/enrollments')).enrollments;
        if (u.role === 'instructor') {
          const mine: any[] = (await api.get('/courses')).courses;
          const rosters = await Promise.all(mine.map(c => api.get(`/courses/${c.id}/students`).then(r => r.students).catch(() => [])));
          rosters.flat().forEach((s: any) => { directory.current[s.studentId] = { ...stub(s.studentId, s.name, 'student'), email: s.email }; });
        }
        return { enrollments };
      },
      assignments: async () => {
        const list: any[] = (await api.get('/assignments')).assignments;
        const assignments: Assignment[] = list.map(a => ({ id: a.id, courseId: a.courseId, instructorId: a.instructorId, title: a.title, description: a.description, dueDate: a.dueDate, maxPoints: a.maxPoints, createdAt: day(a.createdAt) }));
        let submissions: Submission[] = [];
        if (u.role === 'student') submissions = list.filter(a => a.submission).map(a => toSubmission(a.submission));
        else if (u.role === 'instructor') {
          const all = await Promise.all(list.map(a => api.get(`/assignments/${a.id}/submissions`).then(r => r.submissions).catch(() => [])));
          submissions = all.flat().map(toSubmission);
          submissions.forEach(s => learn(s.studentId, s.studentName || '', 'student'));
        }
        return { assignments, submissions };
      },
      quizzes: async () => {
        const list: any[] = (await api.get('/quizzes')).quizzes;
        const full = u.role === 'instructor' ? await Promise.all(list.map(q => api.get(`/quizzes/${q.id}`).then(r => r.quiz.questions as Question[]).catch(() => []))) : list.map(() => []);
        const attempts = await Promise.all(list.map(q => api.get(`/quizzes/${q.id}/attempts`).then(r => r.attempts).catch(() => [])));
        const quizAttempts = attempts.flat().filter((a: any) => a.status === 'completed').map(toAttempt);
        quizAttempts.forEach(a => learn(a.studentId, a.studentName || '', 'student'));
        return { quizzes: list.map((q, i) => toQuiz(q, full[i])), quizAttempts };
      },
      social: async () => {
        const threads: any[] = (await api.get('/threads')).threads;
        threads.forEach(t => { learn(t.authorId, t.authorName, t.authorRole); t.replies.forEach((r: any) => learn(r.authorId, r.authorName, r.authorRole)); });
        return { discussions: threads.map(t => ({ id: t.id, courseId: t.courseId, authorId: t.authorId, title: t.title, body: t.body, createdAt: t.createdAt, replies: t.replies.map((r: any) => ({ id: r.id, threadId: r.threadId, authorId: r.authorId, body: r.body, createdAt: r.createdAt })) })) };
      },
      messages: async () => {
        const [inbox, sent, contacts] = await Promise.all([api.get('/messages'), api.get('/messages?box=sent'), api.get('/contacts')]);
        const byId = new Map<string, any>();
        [...inbox.messages, ...sent.messages].forEach((m: any) => { byId.set(m.id, m); learn(m.fromId, m.fromName, 'student'); learn(m.toId, m.toName, 'student'); });
        const messages: Message[] = [...byId.values()].map(m => ({ id: m.id, fromId: m.fromId, toId: m.toId, subject: m.subject, body: m.body, sentAt: m.sentAt, isRead: m.isRead }));
        contacts.contacts.forEach((c: Contact) => { directory.current[c.id] = stub(c.id, c.name, c.role); });
        return { messages, contacts: contacts.contacts };
      },
      notifications: async () => ({ notifications: (await api.get('/notifications')).notifications }),
      users: async () => (staff && u.role === 'admin' ? { users: (await api.get('/admin/users')).users.map(toUser) } : {}),
    };
  }, []);

  const reload = useCallback(async (...slices: Slice[]) => {
    const u = userRef.current;
    if (!u) return;
    const gen = generation.current;
    const L = loaders(u);
    const names = (slices.length ? slices : (Object.keys(L) as Slice[]));
    const results = await Promise.all(names.map(n => L[n]().catch(e => { if (!(e instanceof ApiError && e.status === 401)) console.error(`load ${n} failed`, e); return {} as Partial<AppState>; })));
    if (gen !== generation.current) return;
    setState(s => Object.assign({ ...s }, ...results));
  }, [loaders]);

  const enter = useCallback(async (user: User, goHome: boolean) => {
    generation.current += 1; directory.current = {};
    userRef.current = user;
    setState(s => ({ ...s, currentUser: user, dataReady: false }));
    await reload();
    setState(s => ({ ...s, dataReady: true }));
    if (goHome) navigate(homeFor(user));
  }, [reload, navigate]);

  const clearSession = useCallback((toRoute: Route = 'landing') => {
    generation.current += 1; directory.current = {}; userRef.current = null;
    setState(s => ({ ...s, currentUser: null, route: toRoute, routeParams: {}, users: [], courses: [], enrollments: [], assignments: [], submissions: [], quizzes: [], quizAttempts: [], discussions: [], messages: [], notifications: [], contacts: [], materials: {}, dataReady: false }));
  }, []);

  // Session restore on first load, and global handling of an expired session.
  useEffect(() => {
    setUnauthorizedHandler(() => { if (userRef.current) { clearSession('login'); addToast('Your session has ended. Please sign in again.', 'warning'); } });
    api.get('/auth/me', { quiet401: true }).then(r => enter(toUser(r.user), false)).catch(() => {}).finally(() => setState(s => ({ ...s, sessionChecked: true })));
    return () => setUnauthorizedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auth ──
  const login = useCallback(async (email: string, password: string): Promise<Result> => {
    try { const r = await api.post('/auth/login', { email, password }, { quiet401: true }); await enter(toUser(r.user), true); return { ok: true }; }
    catch (e) { return { ok: false, error: errorMessage(e) }; }
  }, [enter]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<Result> => {
    try { const r = await api.post('/auth/register', { name, email, password }, { quiet401: true }); await enter(toUser(r.user), true); return { ok: true }; }
    catch (e) { return { ok: false, error: errorMessage(e) }; }
  }, [enter]);

  const logout = useCallback(async () => { try { await api.post('/auth/logout', {}, { quiet401: true }); } catch { /* already signed out */ } clearSession('landing'); }, [clearSession]);

  const updateProfile = useCallback(async (data: Partial<Pick<User, 'name' | 'bio' | 'phone' | 'location'>>) => {
    try { const r = await api.patch('/auth/me', data); update({ currentUser: toUser(r.user) }); addToast('Profile updated!'); return true; } catch (e) { fail(e); return false; }
  }, [addToast, fail]);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<Result> => {
    try { await api.post('/auth/change-password', { currentPassword, newPassword }); setState(s => ({ ...s, currentUser: s.currentUser && { ...s.currentUser, mustChangePassword: false } })); addToast('Password updated'); return { ok: true }; }
    catch (e) { return { ok: false, error: errorMessage(e) }; }
  }, [addToast]);

  // generic mutation wrapper: run, refresh the affected slices, toast on failure
  const act = useCallback(async <T,>(fn: () => Promise<T>, slices: Slice[], success?: string): Promise<T | null> => {
    try { const r = await fn(); if (slices.length) await reload(...slices); if (success) addToast(success); return r; } catch (e) { fail(e); return null; }
  }, [reload, addToast, fail]);

  // ── student ──
  const enrollInCourse = useCallback(async (courseId: string) => {
    const u = userRef.current; if (!u) return;
    if (u.role !== 'student') { addToast('Only student accounts can enrol in courses', 'warning'); return; }
    if (state.enrollments.some(e => e.studentId === u.id && e.courseId === courseId)) { navigate('student-learn', { courseId }); return; }
    const ok = await act(() => api.post(`/courses/${courseId}/enroll`), ['enrollments', 'courses', 'assignments', 'quizzes', 'social'], 'Successfully enrolled in course!');
    if (ok) navigate('student-learn', { courseId });
  }, [state.enrollments, act, navigate, addToast]);

  const markLessonComplete = useCallback(async (_courseId: string, lessonId: string) => { await act(() => api.post(`/lessons/${lessonId}/complete`), ['enrollments'], 'Lesson marked as complete!'); }, [act]);

  const submitAssignment = useCallback(async (assignmentId: string, content: string, file: File) =>
    !!(await act(() => api.upload(`/assignments/${assignmentId}/submit`, file, { content }), ['assignments'], 'Assignment submitted successfully!')), [act]);

  const startQuizAttempt = useCallback(async (quizId: string) => {
    try {
      const r = await api.post(`/quizzes/${quizId}/attempts`);
      return { attempt: r.attempt as LiveAttempt, questions: r.questions as AttemptQuestion[], offsetMs: new Date(r.serverTime).getTime() - Date.now() };
    } catch (e) { fail(e); return null; }
  }, [fail]);

  const saveQuizAnswers = useCallback(async (attemptId: string, answers: number[]) => { try { await api.put(`/attempts/${attemptId}/answers`, { answers }); return true; } catch { return false; } }, []);

  const finishQuizAttempt = useCallback(async (attemptId: string, answers?: number[]) => {
    try { const r = await api.post(`/attempts/${attemptId}/submit`, answers ? { answers } : {}); await reload('quizzes', 'notifications'); return r.attempt as LiveAttempt; } catch (e) { fail(e); return null; }
  }, [reload, fail]);

  // ── instructor ──
  const gradeSubmission = useCallback(async (submissionId: string, grade: number, feedback: string) =>
    !!(await act(() => api.put(`/submissions/${submissionId}/grade`, { score: grade, feedback }), ['assignments'], 'Grade submitted!')), [act]);

  const createCourse = useCallback(async (data: Partial<Course>): Promise<Course | null> => {
    const r = await act(() => api.post('/courses', { title: data.title, description: data.description, category: data.category, level: data.level, thumbnail: data.thumbnail }), ['courses'], 'Course created!');
    return r ? toCourse(r.course, (r.course.modules || []).map(toModule)) : null;
  }, [act]);

  const updateCourse = useCallback(async (courseId: string, data: Partial<Pick<Course, 'title' | 'description' | 'category' | 'level' | 'thumbnail' | 'isPublished'>>) =>
    !!(await act(() => api.patch(`/courses/${courseId}`, data), ['courses'], 'Course updated!')), [act]);

  const toggleCoursePublished = useCallback(async (courseId: string) => {
    const c = state.courses.find(x => x.id === courseId); if (!c) return;
    await act(() => api.patch(`/courses/${courseId}`, { isPublished: !c.isPublished }), ['courses'], c.isPublished ? 'Course unpublished' : 'Course published!');
  }, [state.courses, act]);

  const deleteCourse = useCallback(async (courseId: string) => !!(await act(() => api.del(`/courses/${courseId}`), ['courses', 'assignments', 'quizzes', 'social'], 'Course deleted')), [act]);
  const addModule = useCallback(async (courseId: string, title: string) => { await act(() => api.post(`/courses/${courseId}/modules`, { title }), ['courses'], 'Module added!'); }, [act]);
  const renameModule = useCallback(async (moduleId: string, title: string) => { await act(() => api.patch(`/modules/${moduleId}`, { title }), ['courses'], 'Module renamed'); }, [act]);
  const deleteModule = useCallback(async (moduleId: string) => { await act(() => api.del(`/modules/${moduleId}`), ['courses', 'enrollments'], 'Module removed'); }, [act]);
  const addLesson = useCallback(async (moduleId: string, _courseId: string, title: string, type: Lesson['type'], content = '', durationMinutes = 0) => {
    await act(() => api.post(`/modules/${moduleId}/lessons`, { title, type, content, durationMinutes }), ['courses'], 'Lesson added!');
  }, [act]);
  const updateLesson = useCallback(async (lessonId: string, data: Partial<Pick<Lesson, 'title' | 'type' | 'content' | 'durationMinutes'>>) => { await act(() => api.patch(`/lessons/${lessonId}`, data), ['courses'], 'Lesson saved'); }, [act]);
  const deleteLesson = useCallback(async (lessonId: string) => { await act(() => api.del(`/lessons/${lessonId}`), ['courses', 'enrollments'], 'Lesson removed'); }, [act]);

  const loadMaterials = useCallback(async (courseId: string) => {
    try { const r = await api.get(`/courses/${courseId}/materials`); setState(s => ({ ...s, materials: { ...s.materials, [courseId]: r.materials } })); }
    catch (e) { if (!(e instanceof ApiError && (e.status === 403 || e.status === 404))) fail(e); }
  }, [fail]);
  const uploadMaterial = useCallback(async (courseId: string, file: File) => {
    const ok = await act(() => api.upload(`/courses/${courseId}/materials`, file), [], 'File uploaded');
    if (ok) await loadMaterials(courseId);
    return !!ok;
  }, [act, loadMaterials]);
  const deleteMaterial = useCallback(async (courseId: string, materialId: string) => { if (await act(() => api.del(`/materials/${materialId}`), [], 'File removed')) await loadMaterials(courseId); }, [act, loadMaterials]);

  const createQuiz = useCallback(async (courseId: string, data: Parameters<AppContextType['createQuiz']>[1], publish: boolean) => {
    const r = await act(() => api.post(`/courses/${courseId}/quizzes`, data), []);
    if (!r) return false;
    if (publish) { const p = await act(() => api.patch(`/quizzes/${r.quiz.id}`, { isPublished: true }), []); if (!p) { await reload('quizzes'); return false; } }
    await reload('quizzes'); addToast(publish ? 'Quiz created and published!' : 'Quiz saved as a draft'); return true;
  }, [act, reload, addToast]);
  const setQuizPublished = useCallback(async (quizId: string, published: boolean) => { await act(() => api.patch(`/quizzes/${quizId}`, { isPublished: published }), ['quizzes'], published ? 'Quiz published' : 'Quiz unpublished'); }, [act]);
  const deleteQuiz = useCallback(async (quizId: string) => { await act(() => api.del(`/quizzes/${quizId}`), ['quizzes'], 'Quiz deleted'); }, [act]);

  const createAssignment = useCallback(async (courseId: string, data: { title: string; description: string; dueDate: string; maxPoints: number }) =>
    !!(await act(() => api.post(`/courses/${courseId}/assignments`, data), ['assignments'], 'Assignment created!')), [act]);

  // ── communication ──
  const postDiscussion = useCallback(async (courseId: string, title: string, body: string) => { await act(() => api.post(`/courses/${courseId}/threads`, { title, body }), ['social', 'notifications'], 'Discussion posted!'); }, [act]);
  const replyToDiscussion = useCallback(async (threadId: string, body: string) => { await act(() => api.post(`/threads/${threadId}/posts`, { body }), ['social'], 'Reply posted!'); }, [act]);
  const deleteDiscussion = useCallback(async (threadId: string) => { await act(() => api.del(`/threads/${threadId}`), ['social'], 'Discussion deleted'); }, [act]);
  const sendMessage = useCallback(async (toId: string, subject: string, body: string) => !!(await act(() => api.post('/messages', { toId, subject, body }), ['messages'], 'Message sent!')), [act]);
  const markMessageRead = useCallback(async (msgId: string) => {
    setState(s => ({ ...s, messages: s.messages.map(m => m.id === msgId ? { ...m, isRead: true } : m) }));
    try { await api.post(`/messages/${msgId}/read`); } catch { /* the sender cannot mark; ignore */ }
  }, []);
  const markNotificationRead = useCallback(async (id: string) => { setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) })); try { await api.post(`/notifications/${id}/read`); } catch { /* ignore */ } }, []);
  const markAllNotificationsRead = useCallback(async () => { setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, isRead: true })) })); try { await api.post('/notifications/read-all'); } catch { /* ignore */ } }, []);

  // ── admin ──
  const createUser = useCallback(async (name: string, email: string, role: User['role']) => {
    try { const r = await api.post('/admin/users', { name, email, role }); await reload('users'); return { ok: true, temporaryPassword: r.temporaryPassword as string }; }
    catch (e) { return { ok: false, error: errorMessage(e) }; }
  }, [reload]);
  const setUserRole = useCallback(async (userId: string, role: User['role']) => { await act(() => api.patch(`/admin/users/${userId}`, { role }), ['users'], 'Role updated'); }, [act]);
  const toggleUserActive = useCallback(async (userId: string) => {
    const t = state.users.find(u => u.id === userId); if (!t) return;
    await act(() => api.patch(`/admin/users/${userId}`, { isActive: !t.isActive }), ['users'], t.isActive ? 'User deactivated' : 'User activated');
  }, [state.users, act]);
  const deleteUser = useCallback(async (userId: string) => { await act(() => api.del(`/admin/users/${userId}`), ['users'], 'User deleted'); }, [act]);

  // ── lookups ──
  const getUserById = (id: string): User | undefined => state.users.find(u => u.id === id) || (state.currentUser?.id === id ? state.currentUser : undefined) || directory.current[id];
  const getCourseById = (id: string) => state.courses.find(c => c.id === id);
  const getEnrollmentsForCourse = (courseId: string) => state.enrollments.filter(e => e.courseId === courseId);
  const getAssignmentsForCourse = (courseId: string) => state.assignments.filter(a => a.courseId === courseId);
  const getQuizzesForCourse = (courseId: string) => state.quizzes.filter(q => q.courseId === courseId);

  const ctx: AppContextType = {
    ...state, navigate, reload,
    login, logout, register, updateProfile, changePassword,
    enrollInCourse, markLessonComplete, submitAssignment, startQuizAttempt, saveQuizAnswers, finishQuizAttempt,
    gradeSubmission, createCourse, updateCourse, toggleCoursePublished, deleteCourse, addModule, renameModule, deleteModule, addLesson, updateLesson, deleteLesson,
    loadMaterials, uploadMaterial, deleteMaterial, createQuiz, setQuizPublished, deleteQuiz, createAssignment,
    postDiscussion, replyToDiscussion, deleteDiscussion, sendMessage, markMessageRead, markNotificationRead, markAllNotificationsRead,
    createUser, setUserRole, toggleUserActive, deleteUser,
    getUserById, getCourseById, getEnrollmentsForCourse, getAssignmentsForCourse, getQuizzesForCourse, addToast, removeToast,
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
