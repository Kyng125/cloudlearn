import { useEffect } from 'react';
import { AppProvider, useApp, type Route } from './context';
import { ToastContainer } from './components/UI';

// Public pages
import { Landing, CourseBrowser, CourseDetail } from './pages/Landing';
import { Login, Register, ForgotPassword } from './pages/Auth';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import { MyCourses, CourseLearn } from './pages/student/Courses';
import { Assignments, QuizList, QuizTaker } from './pages/student/Assessments';
import { Discussions, Messages, NotificationsPage } from './pages/student/Social';
import Progress from './pages/student/Progress';
import Profile from './pages/student/Profile';

// Instructor pages
import InstructorDashboard from './pages/instructor/Dashboard';
import { InstructorCourses, CreateCourse, EditCourse, StudentManagement } from './pages/instructor/CourseManagement';
import Grading from './pages/instructor/Grading';
import QuizBuilder from './pages/instructor/QuizBuilder';
import Analytics from './pages/instructor/Analytics';
import { InstructorProfile } from './pages/admin/AdminPages';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import { AdminCourses, AdminCategories, AdminReports, ActivityLogs, BackupRecovery, SystemSettings } from './pages/admin/AdminPages';

// Sends a signed-in user to their own dashboard when they land on another role's route.
function RoleRedirect() {
  const { currentUser, navigate } = useApp();
  useEffect(() => {
    if (currentUser) navigate(`${currentUser.role}-dashboard` as Route);
  }, [currentUser, navigate]);
  return null;
}

function Router() {
  const { route, currentUser, sessionChecked } = useApp();
  if (!sessionChecked) return <div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-[#6b7fa8]" role="status">Loading CloudLearn…</div>;

  // Public routes
  if (route === 'landing') return <Landing />;
  if (route === 'login') return <Login />;
  if (route === 'register') return <Register />;
  if (route === 'forgot-password') return <ForgotPassword />;
  if (route === 'courses') return <CourseBrowser />;
  if (route === 'course-detail') return <CourseDetail />;

  // Auth guard
  if (!currentUser) return <Login />;

  // Role guard: routes are namespaced by role prefix
  const prefix = route.split('-')[0];
  if ((prefix === 'student' || prefix === 'instructor' || prefix === 'admin') && prefix !== currentUser.role) {
    return <RoleRedirect />;
  }

  // Student routes
  if (route === 'student-dashboard') return <StudentDashboard />;
  if (route === 'student-my-courses') return <MyCourses />;
  if (route === 'student-browse') return <CourseBrowser />;
  if (route === 'student-learn') return <CourseLearn />;
  if (route === 'student-assignments') return <Assignments />;
  if (route === 'student-quiz') return <QuizList />;
  if (route === 'student-quiz-take') return <QuizTaker />;
  if (route === 'student-progress') return <Progress />;
  if (route === 'student-discussions') return <Discussions />;
  if (route === 'student-messages') return <Messages />;
  if (route === 'student-notifications') return <NotificationsPage />;
  if (route === 'student-profile') return <Profile />;
  if (route === 'student-settings') return <Profile />;

  // Instructor routes
  if (route === 'instructor-dashboard') return <InstructorDashboard />;
  if (route === 'instructor-courses') return <InstructorCourses />;
  if (route === 'instructor-create-course') return <CreateCourse />;
  if (route === 'instructor-edit-course') return <EditCourse />;
  if (route === 'instructor-students') return <StudentManagement />;
  if (route === 'instructor-grading') return <Grading />;
  if (route === 'instructor-quiz-builder') return <QuizBuilder />;
  if (route === 'instructor-analytics') return <Analytics />;
  if (route === 'instructor-discussions') return <Discussions />;
  if (route === 'instructor-messages') return <Messages />;
  if (route === 'instructor-notifications') return <NotificationsPage />;
  if (route === 'instructor-profile') return <InstructorProfile />;
  if (route === 'instructor-settings') return <InstructorProfile />;

  // Admin routes
  if (route === 'admin-dashboard') return <AdminDashboard />;
  if (route === 'admin-users') return <UserManagement />;
  if (route === 'admin-courses') return <AdminCourses />;
  if (route === 'admin-categories') return <AdminCategories />;
  if (route === 'admin-reports') return <AdminReports />;
  if (route === 'admin-analytics') return <Analytics />;
  if (route === 'admin-logs') return <ActivityLogs />;
  if (route === 'admin-backup') return <BackupRecovery />;
  if (route === 'admin-settings') return <SystemSettings />;
  if (route === 'admin-notifications') return <NotificationsPage />;

  return <Landing />;
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <ToastContainer />
    </AppProvider>
  );
}
