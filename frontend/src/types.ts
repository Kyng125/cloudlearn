// Front-end domain types. Shapes mirror the API (see backend/CONTRACT-CHECK-PHASE*.md).
export type Role = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  bio: string;
  phone: string;
  location: string;
  joinedAt: string;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string; // formatted from durationMinutes
  durationMinutes: number;
  thumbnail: string;
  enrolledCount: number;
  isPublished: boolean;
  createdAt: string;
  modules: Module[]; // filled by the course-detail call
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: 'video' | 'document' | 'presentation';
  content: string; // empty for viewers who are not enrolled
  duration: string;
  durationMinutes: number;
  order: number;
}

export interface Material {
  id: string;
  courseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
}

export interface Assignment {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  content: string;
  fileName: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  isLate: boolean;
  status: 'submitted' | 'graded';
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  correctIndex: number; // only present for the quiz owner / admin
  points: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  duration: number; // minutes
  passingScore: number;
  isExam: boolean;
  isPublished: boolean;
  createdAt: string;
  questionCount: number;
  totalPoints: number;
  questions: Question[]; // instructors only; students get questions when an attempt starts
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  studentName?: string;
  answers: number[];
  score: number;
  totalPoints: number;
  passed: boolean;
  completedAt: string;
  timeTaken: number; // seconds
}

/** A question as served during an attempt: no answer key. */
export interface AttemptQuestion { id: string; text: string; options: string[]; points: number }
export interface ReviewItem extends AttemptQuestion { correctIndex: number; explanation: string; yourAnswer: number }
export interface LiveAttempt {
  id: string; quizId: string; startedAt: string; deadline: string; status: 'in_progress' | 'completed'; answers: number[];
  score?: number; totalPoints?: number; passed?: boolean; completedAt?: string; timeTaken?: number; review?: ReviewItem[];
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface DiscussionThread {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  replies: DiscussionReply[];
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  subject: string;
  body: string;
  sentAt: string;
  isRead: boolean;
}

export interface Contact { id: string; name: string; role: Role }

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'grade' | 'message' | 'course' | 'quiz' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}
