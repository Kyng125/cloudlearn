import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  USERS, COURSES, ENROLLMENTS, ASSIGNMENTS, SUBMISSIONS, QUIZZES, QUIZ_ATTEMPTS,
  DISCUSSIONS, MESSAGES, NOTIFICATIONS,
  type User, type Course, type Module, type Lesson, type Enrollment, type Assignment,
  type Submission, type Quiz, type QuizAttempt, type DiscussionThread,
  type DiscussionReply, type Message, type Notification,
} from './data';

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

export interface AppState {
  currentUser: User | null;
  route: Route;
  routeParams: Record<string, string>;
  users: User[];
  courses: Course[];
  enrollments: Enrollment[];
  assignments: Assignment[];
  submissions: Submission[];
  quizzes: Quiz[];
  quizAttempts: QuizAttempt[];
  discussions: DiscussionThread[];
  messages: Message[];
  notifications: Notification[];
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppContextType extends AppState {
  navigate: (route: Route, params?: Record<string, string>) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, password: string, role: 'student' | 'instructor') => boolean;
  enrollInCourse: (courseId: string) => void;
  markLessonComplete: (courseId: string, lessonId: string) => void;
  submitAssignment: (assignmentId: string, content: string, fileName: string) => void;
  gradeSubmission: (submissionId: string, grade: number, feedback: string) => void;
  submitQuizAttempt: (quizId: string, answers: number[], timeTaken?: number) => QuizAttempt;
  postDiscussion: (courseId: string, title: string, body: string) => void;
  replyToDiscussion: (threadId: string, body: string) => void;
  sendMessage: (toId: string, subject: string, body: string) => void;
  markMessageRead: (msgId: string) => void;
  markNotificationRead: (notifId: string) => void;
  markAllNotificationsRead: () => void;
  createCourse: (data: Partial<Course>) => Course;
  updateCourse: (courseId: string, data: Partial<Course>) => void;
  toggleCoursePublished: (courseId: string) => void;
  addModule: (courseId: string, title: string) => void;
  addLesson: (moduleId: string, courseId: string, title: string, type: Lesson['type']) => void;
  createQuiz: (data: Partial<Quiz>) => void;
  createAssignment: (data: Partial<Assignment>) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  toggleUserActive: (userId: string) => void;
  deleteUser: (userId: string) => void;
  createUser: (name: string, email: string, role: User['role']) => boolean;
  getUserById: (id: string) => User | undefined;
  getCourseById: (id: string) => Course | undefined;
  getEnrollmentsForCourse: (courseId: string) => Enrollment[];
  getAssignmentsForCourse: (courseId: string) => Assignment[];
  getQuizzesForCourse: (courseId: string) => Quiz[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Bump when the persisted shape or seed data changes so stale browser state is discarded.
const STATE_VERSION = 2;

function loadState(): Partial<AppState> {
  try {
    const raw = localStorage.getItem('cloudlearn_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {}
  return {};
}

function saveState(state: Partial<AppState>) {
  try {
    const { toasts, route, routeParams, currentUser, ...rest } = state as AppState;
    localStorage.setItem('cloudlearn_state', JSON.stringify({ ...rest, version: STATE_VERSION, currentUserId: currentUser?.id }));
  } catch {}
}

let toastCounter = 0;

export function AppProvider({ children }: { children: ReactNode }) {
  const saved = loadState() as any;

  const [state, setState] = useState<AppState>({
    currentUser: saved.currentUserId ? ((saved.users || USERS) as User[]).find(u => u.id === saved.currentUserId && u.isActive) || null : null,
    route: 'landing',
    routeParams: {},
    users: saved.users || [...USERS],
    courses: saved.courses || [...COURSES],
    enrollments: saved.enrollments || [...ENROLLMENTS],
    assignments: saved.assignments || [...ASSIGNMENTS],
    submissions: saved.submissions || [...SUBMISSIONS],
    quizzes: saved.quizzes || [...QUIZZES],
    quizAttempts: saved.quizAttempts || [...QUIZ_ATTEMPTS],
    discussions: saved.discussions || [...DISCUSSIONS],
    messages: saved.messages || [...MESSAGES],
    notifications: saved.notifications || [...NOTIFICATIONS],
    toasts: [],
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = (patch: Partial<AppState>) => setState(s => ({ ...s, ...patch }));

  const navigate = useCallback((route: Route, params: Record<string, string> = {}) => {
    update({ route, routeParams: params });
    window.scrollTo(0, 0);
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `t${++toastCounter}`;
    setState(s => ({ ...s, toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setState(s => ({ ...s, toasts: s.toasts.filter(t => t.id !== id) }));
  }, []);

  const login = useCallback((email: string, password: string) => {
    const user = state.users.find(u => u.email === email && u.password === password && u.isActive);
    if (user) {
      update({ currentUser: user });
      const defaultRoute: Record<string, Route> = { student: 'student-dashboard', instructor: 'instructor-dashboard', admin: 'admin-dashboard' };
      navigate(defaultRoute[user.role] || 'student-dashboard');
      return true;
    }
    return false;
  }, [state.users, navigate]);

  const logout = useCallback(() => {
    update({ currentUser: null });
    navigate('landing');
  }, [navigate]);

  const register = useCallback((name: string, email: string, password: string, role: 'student' | 'instructor') => {
    if (state.users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: `u${Date.now()}`, name, email, password, role,
      avatar: '',
      bio: '', phone: '', location: '', joinedAt: new Date().toISOString().split('T')[0], isActive: true,
    };
    setState(s => {
      const users = [...s.users, newUser];
      return { ...s, users, currentUser: newUser };
    });
    const defaultRoute: Record<string, Route> = { student: 'student-dashboard', instructor: 'instructor-dashboard' };
    navigate(defaultRoute[role]);
    return true;
  }, [state.users, navigate]);

  const enrollInCourse = useCallback((courseId: string) => {
    if (!state.currentUser) return;
    if (state.currentUser.role !== 'student') { addToast('Only student accounts can enrol in courses', 'warning'); return; }
    const exists = state.enrollments.find(e => e.studentId === state.currentUser!.id && e.courseId === courseId);
    if (exists) { navigate('student-learn', { courseId }); return; }
    const newEnrollment: Enrollment = {
      id: `e${Date.now()}`, studentId: state.currentUser.id, courseId,
      enrolledAt: new Date().toISOString().split('T')[0], progress: 0, completedLessons: [],
      lastAccessed: new Date().toISOString().split('T')[0],
    };
    setState(s => {
      const enrollments = [...s.enrollments, newEnrollment];
      const courses = s.courses.map(c => c.id === courseId ? { ...c, enrolledCount: c.enrolledCount + 1 } : c);
      return { ...s, enrollments, courses };
    });
    addToast('Successfully enrolled in course!');
    navigate('student-learn', { courseId });
  }, [state.currentUser, state.enrollments, navigate, addToast]);

  const markLessonComplete = useCallback((courseId: string, lessonId: string) => {
    if (!state.currentUser) return;
    setState(s => {
      const enrollments = s.enrollments.map(e => {
        if (e.studentId !== s.currentUser!.id || e.courseId !== courseId) return e;
        if (e.completedLessons.includes(lessonId)) return e;
        const completedLessons = [...e.completedLessons, lessonId];
        const course = s.courses.find(c => c.id === courseId);
        const totalLessons = course ? course.modules.reduce((acc, m) => acc + m.lessons.length, 0) : 1;
        const progress = Math.round((completedLessons.length / totalLessons) * 100);
        return { ...e, completedLessons, progress, lastAccessed: new Date().toISOString().split('T')[0] };
      });
      return { ...s, enrollments };
    });
    addToast('Lesson marked as complete!');
  }, [state.currentUser, addToast]);

  const submitAssignment = useCallback((assignmentId: string, content: string, fileName: string) => {
    if (!state.currentUser) return;
    const assignment = state.assignments.find(a => a.id === assignmentId);
    const isLate = assignment ? new Date() > new Date(assignment.dueDate) : false;
    const existing = state.submissions.find(s => s.assignmentId === assignmentId && s.studentId === state.currentUser!.id);
    if (existing) { addToast('Assignment already submitted', 'warning'); return; }
    const sub: Submission = {
      id: `s${Date.now()}`, assignmentId, studentId: state.currentUser.id,
      content, fileName, submittedAt: new Date().toISOString(), grade: null,
      feedback: null, isLate, status: 'submitted',
    };
    setState(s => {
      const instructorId = s.assignments.find(a => a.id === assignmentId)?.instructorId;
      const notif: Notification = {
        id: `n${Date.now()}`, userId: instructorId || '', type: 'assignment',
        title: 'New Submission', body: `${s.currentUser!.name} submitted "${s.assignments.find(a => a.id === assignmentId)?.title}"`,
        isRead: false, createdAt: new Date().toISOString(),
      };
      return { ...s, submissions: [...s.submissions, sub], notifications: [...s.notifications, notif] };
    });
    addToast('Assignment submitted successfully!');
  }, [state.currentUser, state.assignments, state.submissions, addToast]);

  const gradeSubmission = useCallback((submissionId: string, grade: number, feedback: string) => {
    setState(s => {
      const submission = s.submissions.find(sub => sub.id === submissionId);
      const submissions = s.submissions.map(sub =>
        sub.id === submissionId ? { ...sub, grade, feedback, status: 'graded' as const } : sub
      );
      const notif: Notification = {
        id: `n${Date.now()}`, userId: submission?.studentId || '', type: 'grade',
        title: 'Assignment Graded', body: `Your assignment has been graded. Score: ${grade}`,
        isRead: false, createdAt: new Date().toISOString(),
      };
      return { ...s, submissions, notifications: [...s.notifications, notif] };
    });
    addToast('Grade submitted!');
  }, [addToast]);

  const submitQuizAttempt = useCallback((quizId: string, answers: number[], timeTaken = 0): QuizAttempt => {
    if (!state.currentUser) throw new Error('Not logged in');
    const quiz = state.quizzes.find(q => q.id === quizId)!;
    let score = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) score += q.points;
    });
    const totalPoints = quiz.questions.reduce((a, q) => a + q.points, 0);
    const attempt: QuizAttempt = {
      id: `qa${Date.now()}`, quizId, studentId: state.currentUser.id,
      answers, score, totalPoints, passed: score >= (totalPoints * quiz.passingScore / 100),
      completedAt: new Date().toISOString(), timeTaken,
    };
    setState(s => ({ ...s, quizAttempts: [...s.quizAttempts, attempt] }));
    return attempt;
  }, [state.currentUser, state.quizzes]);

  const postDiscussion = useCallback((courseId: string, title: string, body: string) => {
    if (!state.currentUser) return;
    const thread: DiscussionThread = {
      id: `d${Date.now()}`, courseId, authorId: state.currentUser.id, title, body,
      createdAt: new Date().toISOString(), replies: [], isPinned: false,
    };
    setState(s => ({ ...s, discussions: [...s.discussions, thread] }));
    addToast('Discussion posted!');
  }, [state.currentUser, addToast]);

  const replyToDiscussion = useCallback((threadId: string, body: string) => {
    if (!state.currentUser) return;
    const reply: DiscussionReply = {
      id: `dr${Date.now()}`, threadId, authorId: state.currentUser.id, body, createdAt: new Date().toISOString(),
    };
    setState(s => ({
      ...s, discussions: s.discussions.map(d =>
        d.id === threadId ? { ...d, replies: [...d.replies, reply] } : d
      ),
    }));
    addToast('Reply posted!');
  }, [state.currentUser, addToast]);

  const sendMessage = useCallback((toId: string, subject: string, body: string) => {
    if (!state.currentUser) return;
    const msg: Message = {
      id: `msg${Date.now()}`, fromId: state.currentUser.id, toId, subject, body,
      sentAt: new Date().toISOString(), isRead: false,
    };
    const notif: Notification = {
      id: `n${Date.now()}`, userId: toId, type: 'message',
      title: 'New Message', body: `${state.currentUser.name}: ${subject}`,
      isRead: false, createdAt: new Date().toISOString(),
    };
    setState(s => ({ ...s, messages: [...s.messages, msg], notifications: [...s.notifications, notif] }));
    addToast('Message sent!');
  }, [state.currentUser, addToast]);

  const markMessageRead = useCallback((msgId: string) => {
    setState(s => ({ ...s, messages: s.messages.map(m => m.id === msgId ? { ...m, isRead: true } : m) }));
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === notifId ? { ...n, isRead: true } : n) }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState(s => ({
      ...s, notifications: s.notifications.map(n =>
        n.userId === s.currentUser?.id ? { ...n, isRead: true } : n
      ),
    }));
  }, []);

  const createCourse = useCallback((data: Partial<Course>): Course => {
    if (!state.currentUser) throw new Error('Not logged in');
    const course: Course = {
      id: `c${Date.now()}`,
      title: data.title || 'Untitled Course',
      description: data.description || '',
      instructorId: state.currentUser.id,
      category: data.category || 'Programming',
      level: data.level || 'Beginner',
      duration: data.duration || '0 hours',
      thumbnail: data.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=340&fit=crop&auto=format',
      enrolledCount: 0,
      isPublished: false,
      createdAt: new Date().toISOString().split('T')[0],
      price: 0,
      rating: 0,
      tags: data.tags || [],
      modules: [],
    };
    setState(s => ({ ...s, courses: [...s.courses, course] }));
    addToast('Course created!');
    return course;
  }, [state.currentUser, addToast]);

  const updateCourse = useCallback((courseId: string, data: Partial<Course>) => {
    setState(s => ({ ...s, courses: s.courses.map(c => c.id === courseId ? { ...c, ...data } : c) }));
    addToast('Course updated!');
  }, [addToast]);

  const toggleCoursePublished = useCallback((courseId: string) => {
    setState(s => ({ ...s, courses: s.courses.map(c => c.id === courseId ? { ...c, isPublished: !c.isPublished } : c) }));
  }, []);

  const addModule = useCallback((courseId: string, title: string) => {
    const mod: Module = { id: `m${Date.now()}`, courseId, title, order: 999, lessons: [] };
    setState(s => ({ ...s, courses: s.courses.map(c => c.id === courseId ? { ...c, modules: [...c.modules, mod] } : c) }));
    addToast('Module added!');
  }, [addToast]);

  const addLesson = useCallback((moduleId: string, courseId: string, title: string, type: Lesson['type']) => {
    const lesson: Lesson = {
      id: `l${Date.now()}`, moduleId, title, type, content: '', duration: '0 min', order: 999, resources: [],
    };
    setState(s => ({
      ...s, courses: s.courses.map(c => c.id === courseId ? {
        ...c, modules: c.modules.map(m => m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m),
      } : c),
    }));
    addToast('Lesson added!');
  }, [addToast]);

  const createQuiz = useCallback((data: Partial<Quiz>) => {
    if (!state.currentUser) return;
    const quiz: Quiz = {
      id: `q${Date.now()}`,
      courseId: data.courseId || '',
      instructorId: state.currentUser.id,
      title: data.title || 'Untitled Quiz',
      description: data.description || '',
      duration: data.duration || 20,
      passingScore: data.passingScore || 70,
      questions: data.questions || [],
      createdAt: new Date().toISOString().split('T')[0],
      isExam: data.isExam || false,
      availableFrom: data.availableFrom || new Date().toISOString().split('T')[0],
      availableUntil: data.availableUntil || '',
    };
    setState(s => ({ ...s, quizzes: [...s.quizzes, quiz] }));
    addToast('Quiz created!');
  }, [state.currentUser, addToast]);

  const createAssignment = useCallback((data: Partial<Assignment>) => {
    if (!state.currentUser) return;
    const assignment: Assignment = {
      id: `a${Date.now()}`,
      courseId: data.courseId || '',
      instructorId: state.currentUser.id,
      title: data.title || 'Untitled Assignment',
      description: data.description || '',
      dueDate: data.dueDate || '',
      maxPoints: data.maxPoints || 100,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setState(s => ({ ...s, assignments: [...s.assignments, assignment] }));
    addToast('Assignment created!');
  }, [state.currentUser, addToast]);

  const updateUser = useCallback((userId: string, data: Partial<User>) => {
    setState(s => {
      const users = s.users.map(u => u.id === userId ? { ...u, ...data } : u);
      const currentUser = s.currentUser?.id === userId ? { ...s.currentUser, ...data } : s.currentUser;
      return { ...s, users, currentUser };
    });
    addToast('Profile updated!');
  }, [addToast]);

  // Guard: an administrator may not lock themselves out or remove the last active admin.
  const adminGuard = (userId: string, action: string): boolean => {
    const target = state.users.find(u => u.id === userId);
    if (!target) return false;
    if (state.currentUser?.id === userId) { addToast(`You cannot ${action} your own account`, 'warning'); return false; }
    if (target.role === 'admin' && state.users.filter(u => u.role === 'admin' && u.isActive).length <= 1) {
      addToast(`Cannot ${action} the last active administrator`, 'warning'); return false;
    }
    return true;
  };

  const toggleUserActive = useCallback((userId: string) => {
    const target = state.users.find(u => u.id === userId);
    if (target?.isActive && !adminGuard(userId, 'deactivate')) return;
    setState(s => ({ ...s, users: s.users.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u) }));
    addToast(target?.isActive ? 'User deactivated' : 'User activated', 'info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.users, state.currentUser, addToast]);

  const deleteUser = useCallback((userId: string) => {
    if (!adminGuard(userId, 'delete')) return;
    setState(s => ({ ...s, users: s.users.filter(u => u.id !== userId) }));
    addToast('User deleted');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.users, state.currentUser, addToast]);

  const createUser = useCallback((name: string, email: string, role: User['role']): boolean => {
    if (state.users.some(u => u.email.toLowerCase() === email.toLowerCase())) { addToast('Email already exists', 'error'); return false; }
    const newUser: User = {
      id: `u${Date.now()}`, name, email, password: 'welcome123', role,
      avatar: '', bio: '', phone: '', location: '', joinedAt: new Date().toISOString().split('T')[0], isActive: true,
    };
    setState(s => ({ ...s, users: [...s.users, newUser] }));
    addToast(`User created. Temporary password: welcome123`);
    return true;
  }, [state.users, addToast]);

  // Live lookups: always read current state, never the static seed arrays.
  const getUserById = (id: string) => state.users.find(u => u.id === id);
  const getCourseById = (id: string) => state.courses.find(c => c.id === id);
  const getEnrollmentsForCourse = (courseId: string) => state.enrollments.filter(e => e.courseId === courseId);
  const getAssignmentsForCourse = (courseId: string) => state.assignments.filter(a => a.courseId === courseId);
  const getQuizzesForCourse = (courseId: string) => state.quizzes.filter(q => q.courseId === courseId);

  const ctx: AppContextType = {
    ...state,
    getUserById, getCourseById, getEnrollmentsForCourse, getAssignmentsForCourse, getQuizzesForCourse, createUser,
    navigate, login, logout, register,
    enrollInCourse, markLessonComplete,
    submitAssignment, gradeSubmission, submitQuizAttempt,
    postDiscussion, replyToDiscussion,
    sendMessage, markMessageRead,
    markNotificationRead, markAllNotificationsRead,
    createCourse, updateCourse, toggleCoursePublished, addModule, addLesson,
    createQuiz, createAssignment,
    updateUser, toggleUserActive, deleteUser,
    addToast, removeToast,
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
