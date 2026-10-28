// All demo data for CloudLearn LMS

export type Role = 'student' | 'instructor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar: string;
  bio: string;
  phone: string;
  location: string;
  joinedAt: string;
  isActive: boolean;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  thumbnail: string;
  enrolledCount: number;
  isPublished: boolean;
  createdAt: string;
  modules: Module[];
  price: number;
  rating: number;
  tags: string[];
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
  content: string;
  duration: string;
  order: number;
  resources: Resource[];
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  progress: number;
  completedLessons: string[];
  lastAccessed: string;
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
  content: string;
  fileName: string;
  submittedAt: string;
  grade: number | null;
  feedback: string | null;
  isLate: boolean;
  status: 'submitted' | 'graded' | 'pending';
}

export interface Quiz {
  id: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  duration: number; // minutes
  passingScore: number;
  questions: Question[];
  createdAt: string;
  isExam: boolean;
  availableFrom: string;
  availableUntil: string;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  options: string[];
  correctIndex: number;
  points: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: number[];
  score: number;
  totalPoints: number;
  passed: boolean;
  completedAt: string;
  timeTaken: number; // seconds
}

export interface DiscussionThread {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  replies: DiscussionReply[];
  isPinned: boolean;
}

export interface DiscussionReply {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
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

export interface Notification {
  id: string;
  userId: string;
  type: 'assignment' | 'grade' | 'message' | 'course' | 'quiz' | 'system';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// ── Users ──────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Alex Johnson',
    email: 'student@cloudlearn.com',
    password: 'demo123',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    bio: 'Computer Science student passionate about web development and machine learning.',
    phone: '+1 555-0101',
    location: 'San Francisco, CA',
    joinedAt: '2024-01-15',
    isActive: true,
  },
  {
    id: 'u2',
    name: 'Dr. Sarah Chen',
    email: 'instructor@cloudlearn.com',
    password: 'demo123',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b608?w=80&h=80&fit=crop&auto=format',
    bio: 'PhD in Computer Science with 10 years of teaching experience. Specializes in data science and algorithms.',
    phone: '+1 555-0202',
    location: 'Boston, MA',
    joinedAt: '2023-09-01',
    isActive: true,
  },
  {
    id: 'u3',
    name: 'Marcus Williams',
    email: 'admin@cloudlearn.com',
    password: 'demo123',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format',
    bio: 'Platform administrator ensuring smooth operation of CloudLearn.',
    phone: '+1 555-0303',
    location: 'New York, NY',
    joinedAt: '2023-06-01',
    isActive: true,
  },
  {
    id: 'u4',
    name: 'Emily Rodriguez',
    email: 'emily.r@example.com',
    password: 'demo123',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    bio: 'Aspiring data analyst pursuing certifications in Python and SQL.',
    phone: '+1 555-0104',
    location: 'Austin, TX',
    joinedAt: '2024-02-10',
    isActive: true,
  },
  {
    id: 'u5',
    name: 'Prof. James Okafor',
    email: 'james.o@example.com',
    password: 'demo123',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&auto=format',
    bio: 'Professor of Digital Marketing with 8 years of industry experience.',
    phone: '+1 555-0205',
    location: 'Chicago, IL',
    joinedAt: '2023-10-15',
    isActive: true,
  },
  {
    id: 'u6',
    name: 'Priya Patel',
    email: 'priya.p@example.com',
    password: 'demo123',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&auto=format',
    bio: 'UX designer looking to strengthen programming skills.',
    phone: '+1 555-0106',
    location: 'Seattle, WA',
    joinedAt: '2024-03-01',
    isActive: true,
  },
  {
    id: 'u7',
    name: 'David Kim',
    email: 'david.k@example.com',
    password: 'demo123',
    role: 'student',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format',
    bio: 'Full-stack developer learning cloud technologies.',
    phone: '+1 555-0107',
    location: 'Los Angeles, CA',
    joinedAt: '2024-01-28',
    isActive: true,
  },
  {
    id: 'u8',
    name: 'Dr. Lisa Thompson',
    email: 'lisa.t@example.com',
    password: 'demo123',
    role: 'instructor',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&auto=format',
    bio: 'Cybersecurity expert and certified ethical hacker with 15 years of experience.',
    phone: '+1 555-0208',
    location: 'Washington, DC',
    joinedAt: '2023-11-01',
    isActive: true,
  },
];

// ── Courses ──────────────────────────────────────────────────────────────

export const COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Complete Python Programming Bootcamp',
    description: 'Master Python from zero to hero. Learn variables, functions, OOP, data structures, file handling, and build real-world projects.',
    instructorId: 'u2',
    category: 'Programming',
    level: 'Beginner',
    duration: '42 hours',
    thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 1248,
    isPublished: true,
    createdAt: '2024-01-10',
    price: 0,
    rating: 4.8,
    tags: ['python', 'programming', 'beginner'],
    modules: [
      {
        id: 'm1',
        courseId: 'c1',
        title: 'Introduction to Python',
        order: 1,
        lessons: [
          { id: 'l1', moduleId: 'm1', title: 'What is Python?', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '12 min', order: 1, resources: [{ id: 'r1', name: 'Python Cheatsheet.pdf', type: 'pdf', url: '#' }] },
          { id: 'l2', moduleId: 'm1', title: 'Setting Up Your Environment', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '15 min', order: 2, resources: [] },
          { id: 'l3', moduleId: 'm1', title: 'Your First Python Program', type: 'document', content: 'Writing your first Hello World program in Python. Understanding print() and comments.', duration: '8 min', order: 3, resources: [] },
        ],
      },
      {
        id: 'm2',
        courseId: 'c1',
        title: 'Variables and Data Types',
        order: 2,
        lessons: [
          { id: 'l4', moduleId: 'm2', title: 'Understanding Variables', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '18 min', order: 1, resources: [] },
          { id: 'l5', moduleId: 'm2', title: 'Strings and Numbers', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '22 min', order: 2, resources: [{ id: 'r2', name: 'Data Types Reference.pdf', type: 'pdf', url: '#' }] },
          { id: 'l6', moduleId: 'm2', title: 'Lists and Dictionaries', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 3, resources: [] },
        ],
      },
      {
        id: 'm3',
        courseId: 'c1',
        title: 'Control Flow and Functions',
        order: 3,
        lessons: [
          { id: 'l7', moduleId: 'm3', title: 'If/Else Statements', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '20 min', order: 1, resources: [] },
          { id: 'l8', moduleId: 'm3', title: 'Loops: for and while', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '24 min', order: 2, resources: [] },
          { id: 'l9', moduleId: 'm3', title: 'Defining Functions', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '28 min', order: 3, resources: [{ id: 'r3', name: 'Functions Exercises.zip', type: 'zip', url: '#' }] },
        ],
      },
    ],
  },
  {
    id: 'c2',
    title: 'Data Science with Pandas & NumPy',
    description: 'Hands-on data analysis using Python, Pandas, NumPy, and Matplotlib. Covers data wrangling, visualization, and statistical analysis.',
    instructorId: 'u2',
    category: 'Data Science',
    level: 'Intermediate',
    duration: '38 hours',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 892,
    isPublished: true,
    createdAt: '2024-02-01',
    price: 0,
    rating: 4.7,
    tags: ['data science', 'python', 'pandas'],
    modules: [
      {
        id: 'm4',
        courseId: 'c2',
        title: 'NumPy Fundamentals',
        order: 1,
        lessons: [
          { id: 'l10', moduleId: 'm4', title: 'Arrays and Operations', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '30 min', order: 1, resources: [] },
          { id: 'l11', moduleId: 'm4', title: 'Matrix Operations', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 2, resources: [{ id: 'r4', name: 'NumPy Exercises.ipynb', type: 'notebook', url: '#' }] },
        ],
      },
      {
        id: 'm5',
        courseId: 'c2',
        title: 'Pandas for Data Analysis',
        order: 2,
        lessons: [
          { id: 'l12', moduleId: 'm5', title: 'DataFrames and Series', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '35 min', order: 1, resources: [] },
          { id: 'l13', moduleId: 'm5', title: 'Data Cleaning and Wrangling', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '40 min', order: 2, resources: [] },
          { id: 'l14', moduleId: 'm5', title: 'Grouping and Aggregation', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '32 min', order: 3, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c3',
    title: 'Digital Marketing Masterclass',
    description: 'Comprehensive digital marketing covering SEO, SEM, social media, email marketing, content strategy, and analytics.',
    instructorId: 'u5',
    category: 'Marketing',
    level: 'Beginner',
    duration: '28 hours',
    thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 1567,
    isPublished: true,
    createdAt: '2024-01-20',
    price: 0,
    rating: 4.6,
    tags: ['marketing', 'seo', 'social media'],
    modules: [
      {
        id: 'm6',
        courseId: 'c3',
        title: 'SEO Fundamentals',
        order: 1,
        lessons: [
          { id: 'l15', moduleId: 'm6', title: 'How Search Engines Work', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '20 min', order: 1, resources: [] },
          { id: 'l16', moduleId: 'm6', title: 'Keyword Research', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '28 min', order: 2, resources: [{ id: 'r5', name: 'SEO Checklist.pdf', type: 'pdf', url: '#' }] },
        ],
      },
      {
        id: 'm7',
        courseId: 'c3',
        title: 'Social Media Marketing',
        order: 2,
        lessons: [
          { id: 'l17', moduleId: 'm7', title: 'Platform Strategy', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '22 min', order: 1, resources: [] },
          { id: 'l18', moduleId: 'm7', title: 'Content Creation', type: 'presentation', content: 'Content creation strategies for different platforms...', duration: '18 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c4',
    title: 'Cybersecurity Fundamentals',
    description: 'Learn the essentials of cybersecurity: threats, vulnerabilities, defense strategies, encryption, network security, and incident response.',
    instructorId: 'u8',
    category: 'Security',
    level: 'Intermediate',
    duration: '35 hours',
    thumbnail: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 743,
    isPublished: true,
    createdAt: '2024-02-15',
    price: 0,
    rating: 4.9,
    tags: ['cybersecurity', 'networking', 'security'],
    modules: [
      {
        id: 'm8',
        courseId: 'c4',
        title: 'Security Basics',
        order: 1,
        lessons: [
          { id: 'l19', moduleId: 'm8', title: 'CIA Triad', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '15 min', order: 1, resources: [] },
          { id: 'l20', moduleId: 'm8', title: 'Common Threats', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 2, resources: [] },
        ],
      },
      {
        id: 'm9',
        courseId: 'c4',
        title: 'Network Security',
        order: 2,
        lessons: [
          { id: 'l21', moduleId: 'm9', title: 'Firewalls and VPNs', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '30 min', order: 1, resources: [{ id: 'r6', name: 'Network Security Lab.pdf', type: 'pdf', url: '#' }] },
          { id: 'l22', moduleId: 'm9', title: 'Intrusion Detection', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '28 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c5',
    title: 'React & Modern Frontend Development',
    description: 'Build production-ready web apps with React 18, TypeScript, hooks, state management, REST APIs, and deployment on the cloud.',
    instructorId: 'u2',
    category: 'Programming',
    level: 'Intermediate',
    duration: '45 hours',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 2103,
    isPublished: true,
    createdAt: '2023-12-01',
    price: 0,
    rating: 4.9,
    tags: ['react', 'javascript', 'frontend'],
    modules: [
      {
        id: 'm10',
        courseId: 'c5',
        title: 'React Fundamentals',
        order: 1,
        lessons: [
          { id: 'l23', moduleId: 'm10', title: 'Components and JSX', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '20 min', order: 1, resources: [] },
          { id: 'l24', moduleId: 'm10', title: 'Props and State', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 2, resources: [] },
          { id: 'l25', moduleId: 'm10', title: 'Hooks: useState and useEffect', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '35 min', order: 3, resources: [{ id: 'r7', name: 'Hooks Cheatsheet.pdf', type: 'pdf', url: '#' }] },
        ],
      },
      {
        id: 'm11',
        courseId: 'c5',
        title: 'State Management',
        order: 2,
        lessons: [
          { id: 'l26', moduleId: 'm11', title: 'Context API', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '28 min', order: 1, resources: [] },
          { id: 'l27', moduleId: 'm11', title: 'Redux Toolkit', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '40 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c6',
    title: 'Cloud Computing with AWS',
    description: 'Get hands-on with AWS services: EC2, S3, Lambda, RDS, CloudFront, IAM, and DevOps pipelines. Prepare for the AWS Solutions Architect exam.',
    instructorId: 'u8',
    category: 'Cloud',
    level: 'Advanced',
    duration: '52 hours',
    thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 564,
    isPublished: true,
    createdAt: '2024-03-01',
    price: 0,
    rating: 4.7,
    tags: ['aws', 'cloud', 'devops'],
    modules: [
      {
        id: 'm12',
        courseId: 'c6',
        title: 'AWS Core Services',
        order: 1,
        lessons: [
          { id: 'l28', moduleId: 'm12', title: 'EC2 and VPC', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '40 min', order: 1, resources: [] },
          { id: 'l29', moduleId: 'm12', title: 'S3 and CloudFront', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '35 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c7',
    title: 'UI/UX Design Principles',
    description: 'Learn user-centered design, wireframing, prototyping, usability testing, and Figma from scratch. Build a professional design portfolio.',
    instructorId: 'u5',
    category: 'Design',
    level: 'Beginner',
    duration: '30 hours',
    thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 1894,
    isPublished: true,
    createdAt: '2024-01-05',
    price: 0,
    rating: 4.8,
    tags: ['design', 'ux', 'figma'],
    modules: [
      {
        id: 'm13',
        courseId: 'c7',
        title: 'Design Foundations',
        order: 1,
        lessons: [
          { id: 'l30', moduleId: 'm13', title: 'Design Principles', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '18 min', order: 1, resources: [] },
          { id: 'l31', moduleId: 'm13', title: 'Color Theory', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '20 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c8',
    title: 'Machine Learning Fundamentals',
    description: 'Understand ML algorithms, supervised and unsupervised learning, model evaluation, and deploy models with scikit-learn and TensorFlow.',
    instructorId: 'u2',
    category: 'Data Science',
    level: 'Advanced',
    duration: '60 hours',
    thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 432,
    isPublished: true,
    createdAt: '2024-03-10',
    price: 0,
    rating: 4.6,
    tags: ['machine learning', 'python', 'ai'],
    modules: [
      {
        id: 'm14',
        courseId: 'c8',
        title: 'ML Introduction',
        order: 1,
        lessons: [
          { id: 'l32', moduleId: 'm14', title: 'What is Machine Learning?', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 1, resources: [] },
          { id: 'l33', moduleId: 'm14', title: 'Linear Regression', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '35 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c9',
    title: 'Project Management Professional',
    description: 'Master project management methodologies: Agile, Scrum, Kanban, and Waterfall. Prepare for PMP and PSM certifications.',
    instructorId: 'u5',
    category: 'Business',
    level: 'Intermediate',
    duration: '24 hours',
    thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 1102,
    isPublished: true,
    createdAt: '2024-02-20',
    price: 0,
    rating: 4.5,
    tags: ['project management', 'agile', 'scrum'],
    modules: [
      {
        id: 'm15',
        courseId: 'c9',
        title: 'PM Fundamentals',
        order: 1,
        lessons: [
          { id: 'l34', moduleId: 'm15', title: 'Project Lifecycle', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '20 min', order: 1, resources: [] },
          { id: 'l35', moduleId: 'm15', title: 'Agile Overview', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '25 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c10',
    title: 'SQL and Database Design',
    description: 'Learn SQL from basics to advanced: queries, joins, subqueries, stored procedures, and database design for PostgreSQL and MySQL.',
    instructorId: 'u8',
    category: 'Programming',
    level: 'Beginner',
    duration: '22 hours',
    thumbnail: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 1345,
    isPublished: true,
    createdAt: '2024-01-25',
    price: 0,
    rating: 4.7,
    tags: ['sql', 'databases', 'postgresql'],
    modules: [
      {
        id: 'm16',
        courseId: 'c10',
        title: 'SQL Basics',
        order: 1,
        lessons: [
          { id: 'l36', moduleId: 'm16', title: 'SELECT and WHERE', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '18 min', order: 1, resources: [] },
          { id: 'l37', moduleId: 'm16', title: 'JOINs Explained', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '24 min', order: 2, resources: [] },
        ],
      },
    ],
  },
  {
    id: 'c11',
    title: 'Node.js Backend Development',
    description: 'Build scalable APIs with Node.js, Express, JWT authentication, MongoDB, and deploy to cloud infrastructure.',
    instructorId: 'u2',
    category: 'Programming',
    level: 'Intermediate',
    duration: '40 hours',
    thumbnail: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=600&h=340&fit=crop&auto=format',
    enrolledCount: 876,
    isPublished: false,
    createdAt: '2024-04-01',
    price: 0,
    rating: 0,
    tags: ['nodejs', 'backend', 'api'],
    modules: [
      {
        id: 'm17',
        courseId: 'c11',
        title: 'Node.js Core',
        order: 1,
        lessons: [
          { id: 'l38', moduleId: 'm17', title: 'Node.js Architecture', type: 'video', content: 'https://www.youtube.com/embed/Y8Tko2YC5hA', duration: '22 min', order: 1, resources: [] },
        ],
      },
    ],
  },
];

// ── Enrollments ──────────────────────────────────────────────────────────

export const ENROLLMENTS: Enrollment[] = [
  { id: 'e1', studentId: 'u1', courseId: 'c1', enrolledAt: '2024-01-20', progress: 66, completedLessons: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'], lastAccessed: '2024-07-20' },
  { id: 'e2', studentId: 'u1', courseId: 'c2', enrolledAt: '2024-02-05', progress: 40, completedLessons: ['l10', 'l11'], lastAccessed: '2024-07-18' },
  { id: 'e3', studentId: 'u1', courseId: 'c5', enrolledAt: '2024-03-10', progress: 83, completedLessons: ['l23', 'l24', 'l25', 'l26', 'l27'], lastAccessed: '2024-07-22' },
  { id: 'e4', studentId: 'u4', courseId: 'c1', enrolledAt: '2024-02-15', progress: 33, completedLessons: ['l1', 'l2', 'l3'], lastAccessed: '2024-07-15' },
  { id: 'e5', studentId: 'u4', courseId: 'c2', enrolledAt: '2024-03-01', progress: 60, completedLessons: ['l10', 'l11', 'l12'], lastAccessed: '2024-07-19' },
  { id: 'e6', studentId: 'u6', courseId: 'c3', enrolledAt: '2024-03-05', progress: 75, completedLessons: ['l15', 'l16', 'l17'], lastAccessed: '2024-07-21' },
  { id: 'e7', studentId: 'u6', courseId: 'c7', enrolledAt: '2024-03-10', progress: 50, completedLessons: ['l30'], lastAccessed: '2024-07-20' },
  { id: 'e8', studentId: 'u7', courseId: 'c5', enrolledAt: '2024-01-30', progress: 100, completedLessons: ['l23', 'l24', 'l25', 'l26', 'l27'], lastAccessed: '2024-07-10' },
  { id: 'e9', studentId: 'u7', courseId: 'c6', enrolledAt: '2024-03-15', progress: 25, completedLessons: ['l28'], lastAccessed: '2024-07-22' },
  { id: 'e10', studentId: 'u1', courseId: 'c4', enrolledAt: '2024-04-01', progress: 20, completedLessons: ['l19'], lastAccessed: '2024-07-17' },
];

// ── Assignments ──────────────────────────────────────────────────────────

export const ASSIGNMENTS: Assignment[] = [
  { id: 'a1', courseId: 'c1', instructorId: 'u2', title: 'Python Functions Project', description: 'Create a Python program that implements a simple calculator with add, subtract, multiply, and divide functions. Add error handling for division by zero and invalid inputs.', dueDate: '2024-07-30', maxPoints: 100, createdAt: '2024-07-15' },
  { id: 'a2', courseId: 'c1', instructorId: 'u2', title: 'List Comprehension Exercises', description: 'Complete 10 exercises using list comprehensions to transform and filter data. Submit a .py file with your solutions.', dueDate: '2024-07-25', maxPoints: 50, createdAt: '2024-07-10' },
  { id: 'a3', courseId: 'c2', instructorId: 'u2', title: 'Exploratory Data Analysis Report', description: 'Using the provided dataset (titanic.csv), perform a complete EDA using Pandas and Matplotlib. Include at least 5 visualizations and insights.', dueDate: '2024-08-05', maxPoints: 100, createdAt: '2024-07-20' },
  { id: 'a4', courseId: 'c5', instructorId: 'u2', title: 'React Todo Application', description: 'Build a full-featured Todo app using React hooks. Must include: add/edit/delete todos, filter by status, and local storage persistence.', dueDate: '2024-07-28', maxPoints: 100, createdAt: '2024-07-12' },
  { id: 'a5', courseId: 'c3', instructorId: 'u5', title: 'SEO Audit Report', description: 'Perform a complete SEO audit on a website of your choice. Use Google Search Console data, identify issues, and provide actionable recommendations.', dueDate: '2024-08-02', maxPoints: 80, createdAt: '2024-07-18' },
  { id: 'a6', courseId: 'c4', instructorId: 'u8', title: 'Threat Modeling Exercise', description: 'Create a threat model for a given application scenario. Identify assets, threats, vulnerabilities, and mitigations using the STRIDE methodology.', dueDate: '2024-08-10', maxPoints: 100, createdAt: '2024-07-22' },
];

export const SUBMISSIONS: Submission[] = [
  { id: 's1', assignmentId: 'a1', studentId: 'u1', content: 'Submitted via file upload', fileName: 'calculator.py', submittedAt: '2024-07-28', grade: 92, feedback: 'Excellent work! Good error handling and clean code. Minor improvement: add type hints for better readability.', isLate: false, status: 'graded' },
  { id: 's2', assignmentId: 'a2', studentId: 'u1', content: 'Submitted solutions file', fileName: 'list_comprehensions.py', submittedAt: '2024-07-24', grade: 48, feedback: 'Great solutions overall! Q7 and Q9 could be simplified further.', isLate: false, status: 'graded' },
  { id: 's3', assignmentId: 'a4', studentId: 'u1', content: 'React todo app with all features implemented', fileName: 'todo-app.zip', submittedAt: '2024-07-27', grade: null, feedback: null, isLate: false, status: 'submitted' },
  { id: 's4', assignmentId: 'a1', studentId: 'u4', content: 'My calculator implementation', fileName: 'calc.py', submittedAt: '2024-07-31', grade: 75, feedback: 'Good effort! Division by zero handled correctly. Work on code organization.', isLate: true, status: 'graded' },
  { id: 's5', assignmentId: 'a3', studentId: 'u4', content: 'EDA report on Titanic dataset', fileName: 'eda_report.ipynb', submittedAt: '2024-08-04', grade: null, feedback: null, isLate: false, status: 'submitted' },
];

// ── Quizzes ──────────────────────────────────────────────────────────────

export const QUIZZES: Quiz[] = [
  {
    id: 'q1',
    courseId: 'c1',
    instructorId: 'u2',
    title: 'Python Basics Quiz',
    description: 'Test your understanding of Python fundamentals: variables, data types, and control flow.',
    duration: 20,
    passingScore: 70,
    isExam: false,
    availableFrom: '2024-07-01',
    availableUntil: '2024-08-31',
    createdAt: '2024-06-30',
    questions: [
      { id: 'qq1', quizId: 'q1', text: 'What is the output of print(type(42))?', options: ["<class 'int'>", "<class 'str'>", "<class 'float'>", "<class 'number'>"], correctIndex: 0, points: 10 },
      { id: 'qq2', quizId: 'q1', text: 'Which of the following is a mutable data type in Python?', options: ['tuple', 'string', 'list', 'int'], correctIndex: 2, points: 10 },
      { id: 'qq3', quizId: 'q1', text: 'What does the len() function return for an empty list?', options: ['null', '0', '-1', 'None'], correctIndex: 1, points: 10 },
      { id: 'qq4', quizId: 'q1', text: 'Which keyword is used to define a function in Python?', options: ['function', 'func', 'def', 'define'], correctIndex: 2, points: 10 },
      { id: 'qq5', quizId: 'q1', text: 'What is the result of 10 // 3 in Python?', options: ['3.33', '3', '4', '0'], correctIndex: 1, points: 10 },
    ],
  },
  {
    id: 'q2',
    courseId: 'c1',
    instructorId: 'u2',
    title: 'Python Mid-Term Exam',
    description: 'Comprehensive exam covering all topics from Modules 1-3.',
    duration: 60,
    passingScore: 75,
    isExam: true,
    availableFrom: '2024-07-15',
    availableUntil: '2024-07-15',
    createdAt: '2024-07-01',
    questions: [
      { id: 'qq6', quizId: 'q2', text: 'What is list slicing?', options: ['Removing elements from a list', 'Creating a subset of a list', 'Sorting a list', 'Copying a list'], correctIndex: 1, points: 10 },
      { id: 'qq7', quizId: 'q2', text: 'What does *args allow in a function?', options: ['Keyword arguments', 'Variable positional arguments', 'Default values', 'Type hints'], correctIndex: 1, points: 10 },
      { id: 'qq8', quizId: 'q2', text: 'Which is the correct way to open a file in Python?', options: ["file('name.txt')", "open('name.txt')", "read('name.txt')", "load('name.txt')"], correctIndex: 1, points: 10 },
      { id: 'qq9', quizId: 'q2', text: 'What is a lambda function?', options: ['A named function', 'An anonymous function', 'A recursive function', 'A class method'], correctIndex: 1, points: 10 },
      { id: 'qq10', quizId: 'q2', text: 'Which method adds an element to the end of a list?', options: ['add()', 'push()', 'append()', 'insert()'], correctIndex: 2, points: 10 },
    ],
  },
  {
    id: 'q3',
    courseId: 'c5',
    instructorId: 'u2',
    title: 'React Hooks Quiz',
    description: 'Test your understanding of React hooks: useState, useEffect, useContext.',
    duration: 15,
    passingScore: 70,
    isExam: false,
    availableFrom: '2024-07-01',
    availableUntil: '2024-08-31',
    createdAt: '2024-06-25',
    questions: [
      { id: 'qq11', quizId: 'q3', text: 'What hook is used to add state to a functional component?', options: ['useReducer', 'useState', 'useRef', 'useCallback'], correctIndex: 1, points: 10 },
      { id: 'qq12', quizId: 'q3', text: 'When does useEffect run by default?', options: ['Only on mount', 'Only on unmount', 'After every render', 'On prop change only'], correctIndex: 2, points: 10 },
      { id: 'qq13', quizId: 'q3', text: 'What is the second argument to useEffect?', options: ['A callback', 'Dependency array', 'Initial state', 'Cleanup function'], correctIndex: 1, points: 10 },
      { id: 'qq14', quizId: 'q3', text: 'Which hook avoids unnecessary re-renders of child components?', options: ['useMemo', 'useCallback', 'useRef', 'useState'], correctIndex: 1, points: 10 },
    ],
  },
  {
    id: 'q4',
    courseId: 'c4',
    instructorId: 'u8',
    title: 'Cybersecurity Fundamentals Quiz',
    description: 'Test your knowledge of core cybersecurity concepts.',
    duration: 25,
    passingScore: 75,
    isExam: false,
    availableFrom: '2024-07-01',
    availableUntil: '2024-08-31',
    createdAt: '2024-07-01',
    questions: [
      { id: 'qq15', quizId: 'q4', text: 'What does CIA stand for in cybersecurity?', options: ['Central Intelligence Agency', 'Confidentiality, Integrity, Availability', 'Cyber Incident Analysis', 'Computer Infrastructure Audit'], correctIndex: 1, points: 10 },
      { id: 'qq16', quizId: 'q4', text: 'What is a zero-day vulnerability?', options: ['A vulnerability with no known exploit', 'An unknown vulnerability in software', 'A vulnerability patched on day zero', 'A vulnerability with zero impact'], correctIndex: 1, points: 10 },
      { id: 'qq17', quizId: 'q4', text: 'Which protocol encrypts web traffic?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correctIndex: 2, points: 10 },
      { id: 'qq18', quizId: 'q4', text: 'What is social engineering?', options: ['Network hacking', 'Manipulating people to reveal information', 'Code injection', 'Password cracking'], correctIndex: 1, points: 10 },
      { id: 'qq19', quizId: 'q4', text: 'What is the purpose of a firewall?', options: ['To encrypt data', 'To monitor CPU usage', 'To filter network traffic', 'To store passwords'], correctIndex: 2, points: 10 },
    ],
  },
];

export const QUIZ_ATTEMPTS: QuizAttempt[] = [
  { id: 'qa1', quizId: 'q1', studentId: 'u1', answers: [0, 2, 1, 2, 1], score: 40, totalPoints: 50, passed: true, completedAt: '2024-07-10T14:30:00Z', timeTaken: 854 },
  { id: 'qa2', quizId: 'q3', studentId: 'u1', answers: [1, 2, 1, 1], score: 40, totalPoints: 40, passed: true, completedAt: '2024-07-18T10:15:00Z', timeTaken: 612 },
  { id: 'qa3', quizId: 'q1', studentId: 'u4', answers: [0, 2, 1, 2, 0], score: 30, totalPoints: 50, passed: false, completedAt: '2024-07-12T16:00:00Z', timeTaken: 1200 },
  { id: 'qa4', quizId: 'q1', studentId: 'u7', answers: [0, 2, 1, 2, 1], score: 50, totalPoints: 50, passed: true, completedAt: '2024-07-08T09:00:00Z', timeTaken: 721 },
];

// ── Discussions ──────────────────────────────────────────────────────────

export const DISCUSSIONS: DiscussionThread[] = [
  {
    id: 'd1', courseId: 'c1', authorId: 'u1', title: 'How do closures work in Python?',
    body: "I'm confused about how closures work in Python. Can someone explain with a simple example? I understand functions can access outer scope variables, but how does this differ from global variables?",
    createdAt: '2024-07-20T09:00:00Z', isPinned: false,
    replies: [
      { id: 'dr1', threadId: 'd1', authorId: 'u2', body: 'A closure is a function that retains access to variables from its enclosing scope even after the outer function has finished executing. Think of it as a function that carries its environment with it.', createdAt: '2024-07-20T10:30:00Z' },
      { id: 'dr2', threadId: 'd1', authorId: 'u4', body: 'Here\'s a simple example: def make_counter(): count = 0; def increment(): nonlocal count; count += 1; return count; return increment. The inner function "closes over" the count variable.', createdAt: '2024-07-20T11:45:00Z' },
    ],
  },
  {
    id: 'd2', courseId: 'c1', authorId: 'u2', title: '📌 Welcome to Python Bootcamp - Start Here!',
    body: "Welcome to the Python Programming Bootcamp! Please introduce yourself in the replies. Share your background and what you hope to achieve. Remember to complete the setup guide before Lesson 2.",
    createdAt: '2024-01-10T08:00:00Z', isPinned: true,
    replies: [
      { id: 'dr3', threadId: 'd2', authorId: 'u1', body: "Hi! I'm Alex, a CS student. Looking forward to mastering Python!", createdAt: '2024-01-20T14:00:00Z' },
      { id: 'dr4', threadId: 'd2', authorId: 'u4', body: "I'm Emily, transitioning from Excel to Python for data analysis!", createdAt: '2024-02-15T16:00:00Z' },
    ],
  },
  {
    id: 'd3', courseId: 'c5', authorId: 'u7', title: 'Best practices for useEffect cleanup?',
    body: "When should I return a cleanup function from useEffect? I'm seeing memory leaks in my component when navigating away.",
    createdAt: '2024-07-22T14:00:00Z', isPinned: false,
    replies: [
      { id: 'dr5', threadId: 'd3', authorId: 'u2', body: 'Always return cleanup when you have subscriptions, event listeners, timers, or fetch calls. For fetch, use an AbortController. This prevents state updates on unmounted components.', createdAt: '2024-07-22T15:00:00Z' },
    ],
  },
  {
    id: 'd4', courseId: 'c2', authorId: 'u4', title: 'Pandas merge vs join - when to use each?',
    body: "I'm confused about the difference between pd.merge() and DataFrame.join(). Can someone clarify when to use each?",
    createdAt: '2024-07-19T11:00:00Z', isPinned: false,
    replies: [
      { id: 'dr6', threadId: 'd4', authorId: 'u2', body: 'Use merge() when joining on column values (like SQL JOIN). Use join() when joining on index. merge() is more flexible and commonly used.', createdAt: '2024-07-19T13:00:00Z' },
    ],
  },
];

// ── Messages ──────────────────────────────────────────────────────────────

export const MESSAGES: Message[] = [
  { id: 'msg1', fromId: 'u2', toId: 'u1', subject: 'Great progress on the Python assignment!', body: 'Hi Alex,\n\nJust reviewed your calculator assignment and I\'m really impressed with your error handling. The code is clean and well-structured.\n\nKeep up the excellent work!\n\nDr. Chen', sentAt: '2024-07-29T10:00:00Z', isRead: true },
  { id: 'msg2', fromId: 'u1', toId: 'u2', subject: 'Question about Module 3 content', body: 'Hi Dr. Chen,\n\nI have a question about the decorators topic in Module 3. Are we covering functools.wraps as well? I found a great resource about it.\n\nThanks,\nAlex', sentAt: '2024-07-29T14:00:00Z', isRead: true },
  { id: 'msg3', fromId: 'u2', toId: 'u1', subject: 'Re: Question about Module 3 content', body: 'Hi Alex,\n\nYes, we\'ll cover functools.wraps in lesson 3.4. Great initiative looking ahead!\n\nDr. Chen', sentAt: '2024-07-30T08:00:00Z', isRead: false },
  { id: 'msg4', fromId: 'u5', toId: 'u6', subject: 'Your SEO audit assignment feedback', body: 'Hi Priya,\n\nYour draft SEO audit looks promising. Please make sure to include the competitor analysis section as mentioned in the rubric.\n\nProf. Okafor', sentAt: '2024-07-28T16:00:00Z', isRead: true },
  { id: 'msg5', fromId: 'u3', toId: 'u2', subject: 'Platform Update - New Analytics Features', body: 'Hi Dr. Chen,\n\nWe\'ve deployed new analytics features for instructors. You can now see completion rates per lesson and average quiz scores. Login to explore!\n\nMarcus', sentAt: '2024-07-22T09:00:00Z', isRead: true },
];

// ── Notifications ──────────────────────────────────────────────────────────

export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', userId: 'u1', type: 'grade', title: 'Assignment Graded', body: 'Your "Python Functions Project" has been graded. Score: 92/100', isRead: false, createdAt: '2024-07-29T10:05:00Z' },
  { id: 'n2', userId: 'u1', type: 'assignment', title: 'New Assignment', body: 'New assignment "React Todo Application" posted in React & Modern Frontend Development', isRead: false, createdAt: '2024-07-12T09:00:00Z' },
  { id: 'n3', userId: 'u1', type: 'message', title: 'New Message', body: 'Dr. Sarah Chen sent you a message: "Re: Question about Module 3 content"', isRead: false, createdAt: '2024-07-30T08:01:00Z' },
  { id: 'n4', userId: 'u1', type: 'quiz', title: 'Quiz Available', body: '"Python Basics Quiz" is now available. Duration: 20 minutes', isRead: true, createdAt: '2024-07-01T08:00:00Z' },
  { id: 'n5', userId: 'u1', type: 'course', title: 'Course Update', body: 'New lesson added to "Complete Python Programming Bootcamp"', isRead: true, createdAt: '2024-07-15T14:00:00Z' },
  { id: 'n6', userId: 'u2', type: 'assignment', title: 'New Submission', body: 'Alex Johnson submitted "React Todo Application"', isRead: false, createdAt: '2024-07-27T16:30:00Z' },
  { id: 'n7', userId: 'u2', type: 'assignment', title: 'New Submission', body: 'Emily Rodriguez submitted "Exploratory Data Analysis Report"', isRead: false, createdAt: '2024-08-04T14:00:00Z' },
  { id: 'n8', userId: 'u3', type: 'system', title: 'System Backup Complete', body: 'Scheduled backup completed successfully. All data secured.', isRead: false, createdAt: '2024-07-23T03:00:00Z' },
];

// ── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES = [
  { id: 'cat1', name: 'Programming', icon: '💻', courseCount: 5 },
  { id: 'cat2', name: 'Data Science', icon: '📊', courseCount: 3 },
  { id: 'cat3', name: 'Marketing', icon: '📣', courseCount: 2 },
  { id: 'cat4', name: 'Security', icon: '🔒', courseCount: 2 },
  { id: 'cat5', name: 'Design', icon: '🎨', courseCount: 2 },
  { id: 'cat6', name: 'Business', icon: '💼', courseCount: 2 },
  { id: 'cat7', name: 'Cloud', icon: '☁️', courseCount: 1 },
];

// ── Helpers ──────────────────────────────────────────────────────────────

export function getUserById(id: string): User | undefined {
  return USERS.find(u => u.id === id);
}

export function getCourseById(id: string): Course | undefined {
  return COURSES.find(c => c.id === id);
}

export function getEnrollmentsForStudent(studentId: string): Enrollment[] {
  return ENROLLMENTS.filter(e => e.studentId === studentId);
}

export function getEnrollmentsForCourse(courseId: string): Enrollment[] {
  return ENROLLMENTS.filter(e => e.courseId === courseId);
}

export function getCoursesForInstructor(instructorId: string): Course[] {
  return COURSES.filter(c => c.instructorId === instructorId);
}

export function getAssignmentsForCourse(courseId: string): Assignment[] {
  return ASSIGNMENTS.filter(a => a.courseId === courseId);
}

export function getSubmissionsForAssignment(assignmentId: string): Submission[] {
  return SUBMISSIONS.filter(s => s.assignmentId === assignmentId);
}

export function getSubmissionsForStudent(studentId: string): Submission[] {
  return SUBMISSIONS.filter(s => s.studentId === studentId);
}

export function getQuizzesForCourse(courseId: string): Quiz[] {
  return QUIZZES.filter(q => q.courseId === courseId);
}

export function getAttemptsForStudent(studentId: string): QuizAttempt[] {
  return QUIZ_ATTEMPTS.filter(a => a.studentId === studentId);
}

export function getDiscussionsForCourse(courseId: string): DiscussionThread[] {
  return DISCUSSIONS.filter(d => d.courseId === courseId);
}

export function getMessagesForUser(userId: string): Message[] {
  return MESSAGES.filter(m => m.fromId === userId || m.toId === userId);
}

export function getNotificationsForUser(userId: string): Notification[] {
  return NOTIFICATIONS.filter(n => n.userId === userId);
}

// Activity chart data
export const ACTIVITY_DATA = [
  { week: 'W1', minutes: 180 },
  { week: 'W2', minutes: 240 },
  { week: 'W3', minutes: 120 },
  { week: 'W4', minutes: 300 },
  { week: 'W5', minutes: 210 },
  { week: 'W6', minutes: 380 },
  { week: 'W7', minutes: 290 },
  { week: 'W8', minutes: 420 },
];

export const ENROLLMENT_TREND = [
  { month: 'Jan', students: 320 },
  { month: 'Feb', students: 480 },
  { month: 'Mar', students: 620 },
  { month: 'Apr', students: 580 },
  { month: 'May', students: 750 },
  { month: 'Jun', students: 890 },
  { month: 'Jul', students: 1040 },
];
