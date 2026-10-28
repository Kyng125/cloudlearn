Build a complete, production-style, responsive **Cloud-Based E-Learning Platform for Remote and Hybrid Learning** called **CloudLearn**.

The goal is to create a fully functional working demo, not just static UI screens. Build both **desktop and mobile responsive views** with a clean, modern, accessible SaaS/LMS interface. Prioritize functionality and demo readiness: **at least 90% of the core user flows must work**, with realistic seeded demo data and persistent state where possible.

## CORE USER ROLES

Implement three role-based user experiences:

1. **Student**
2. **Instructor**
3. **Administrator**

Create secure authentication and role-based access control. Users should be able to register, log in, log out, and access only the dashboards and features permitted for their role.

Include demo accounts for testing:

* Student
* Instructor
* Administrator

## STUDENT EXPERIENCE

Create a student dashboard containing:

* Welcome message and profile summary
* Enrolled courses
* Course progress percentages
* Upcoming assignments
* Upcoming quizzes/examinations
* Recent grades
* Learning activity
* Notifications
* Quick actions

Students must be able to:

* Browse available courses
* Search and filter courses
* View course details
* Enroll in courses
* Access enrolled courses
* View course modules and lessons
* Watch embedded learning videos
* Read/download learning materials
* View presentations and documents
* Mark lessons as completed
* Track course progress
* Submit assignments
* Upload assignment files
* View submission status
* View grades and instructor feedback
* Take quizzes and examinations
* See quiz results and scores
* Participate in discussion forums
* Create discussion posts
* Reply to discussions
* Send and receive messages
* Manage notifications
* Edit profile and account settings

## INSTRUCTOR EXPERIENCE

Create an instructor dashboard containing:

* Total courses
* Total students
* Pending assignments
* Upcoming quizzes
* Recent submissions
* Student performance overview
* Course engagement statistics

Instructors must be able to:

* Create courses
* Edit courses
* Publish/unpublish courses
* Add course descriptions
* Create modules and lessons
* Upload learning materials
* Add video lessons
* Manage enrolled students
* Create assignments
* Set assignment deadlines
* Review student submissions
* Grade assignments
* Add feedback
* Create quizzes
* Create examination questions
* Configure quiz/exam duration
* Configure passing scores
* View quiz results
* Monitor student performance
* Track course progress
* Participate in discussion forums
* Message students
* View basic course analytics

## ADMINISTRATOR EXPERIENCE

Create a comprehensive administrator dashboard containing:

* Total users
* Total students
* Total instructors
* Total courses
* Active courses
* System activity
* Recent registrations
* Platform usage statistics

Administrators must be able to:

* Manage students
* Manage instructors
* Manage administrators
* Create, edit, deactivate, and delete users
* Manage all courses
* Approve or reject courses
* View platform activity
* Generate reports
* View system analytics
* Manage categories
* Manage notifications
* Review security/activity logs
* Access backup and recovery controls
* Manage platform settings

## COURSE SYSTEM

Build a complete LMS course structure:

Course → Modules → Lessons

Each course should support:

* Course thumbnail
* Title
* Description
* Instructor
* Category
* Level
* Duration
* Enrollment count
* Progress tracking
* Video lessons
* Documents
* Presentations
* Downloadable resources
* Assignments
* Quizzes
* Examinations
* Discussions

Create realistic sample courses and data so the platform looks complete immediately after launch.

## ASSESSMENT SYSTEM

Implement functional:

* Quizzes
* Examinations
* Multiple-choice questions
* Automatic scoring
* Passing score
* Timer/countdown
* Question navigation
* Submit assessment
* Results page
* Score history

Prevent accidental loss of answers during assessment where possible.

## ASSIGNMENT SYSTEM

Implement:

* Assignment creation
* Instructions
* Due dates
* File submission
* Submission status
* Late submission indication
* Instructor grading
* Feedback
* Grade display

## COMMUNICATION

Create:

* Discussion forums
* Course-specific discussions
* Posts
* Replies
* Messaging interface
* Notifications

Use realistic interactions and make buttons and actions functional.

## PROGRESS AND ANALYTICS

Create visual dashboards showing:

* Course completion
* Lesson completion
* Assignment performance
* Quiz performance
* Overall academic progress
* Student engagement

Use charts and progress indicators where appropriate.

## CLOUD-BASED SYSTEM CONCEPT

Visually and functionally represent the cloud-based architecture of the project.

Include:

* Cloud storage concept
* Secure data handling
* Backup and recovery section
* System reliability indicators
* Scalable infrastructure messaging
* Data security messaging

Do not implement advanced AI, machine learning, adaptive learning, intelligent tutoring, or virtual reality features, as these are outside the project's scope.

## PAGES AND ROUTES

Create functional routes/pages for:

Public:

* Landing page
* About
* Features
* Courses
* Course details
* Login
* Register
* Forgot password

Student:

* Student dashboard
* My courses
* Course learning page
* Assignments
* Assignment submission
* Quizzes
* Exams
* Results
* Progress
* Discussions
* Messages
* Notifications
* Profile
* Settings

Instructor:

* Instructor dashboard
* My courses
* Create course
* Edit course
* Course management
* Student management
* Assignments
* Grading
* Quiz builder
* Exam builder
* Discussions
* Messages
* Analytics
* Profile
* Settings

Admin:

* Admin dashboard
* User management
* Course management
* Category management
* Reports
* Analytics
* Activity logs
* Backup/recovery
* System settings

## RESPONSIVE DESIGN

Optimize every page for:

* Desktop
* Tablet
* Mobile

Desktop should use a professional sidebar dashboard layout.

Mobile should use:

* Collapsible navigation
* Bottom navigation where appropriate
* Responsive cards
* Mobile-friendly tables
* Responsive forms
* Touch-friendly buttons
* Properly stacked dashboard sections

Do not simply shrink the desktop interface. Redesign layouts intelligently for mobile usability.

## DESIGN SYSTEM

Use a modern, professional educational SaaS visual style.

Requirements:

* Clean typography
* Strong visual hierarchy
* Accessible contrast
* Consistent spacing
* Rounded cards
* Professional dashboard components
* Clear primary and secondary buttons
* Modern icons
* Responsive data tables
* Empty states
* Loading states
* Success states
* Error states
* Confirmation dialogs
* Toast notifications

Create a consistent design system with reusable components.

## FUNCTIONALITY REQUIREMENT

Prioritize working functionality over decorative complexity.

Make at least 90% of the core flows functional:

* Authentication
* Role switching/role-based access
* Navigation
* Course browsing
* Course enrollment
* Course management
* Lesson completion
* Progress tracking
* Assignment submission
* Assignment grading
* Quiz taking
* Automatic quiz scoring
* Results
* Discussions
* Messaging
* Notifications
* User management
* Course management
* Reports

Use local/mock data and browser persistence where backend infrastructure is unavailable. Structure the application so real cloud services or APIs can be connected later.

Every major button should perform a meaningful action. Avoid dead buttons and placeholder interactions.

## DEMO DATA

Pre-populate the application with realistic sample data:

* 3 user roles
* At least 10 courses
* Multiple instructors
* Multiple students
* Course modules and lessons
* Assignments
* Quiz questions
* Exam questions
* Grades
* Discussion posts
* Messages
* Notifications

Make the demo feel like a real operating educational platform immediately after opening it.

## CREDIT USAGE OPTIMIZATION — VERY IMPORTANT

Build this project in the most credit-efficient way possible.

Do NOT waste credits generating unnecessary decorative screens, duplicate pages, or redundant components.

Prioritize in this exact order:

1. Application architecture
2. Authentication and role-based access
3. Core dashboards
4. Course management
5. Learning experience
6. Assignments and grading
7. Quizzes and examinations
8. Discussions and messaging
9. Progress tracking
10. Admin management
11. Responsive optimization
12. Visual polish

Reuse components, layouts, data structures, and design patterns wherever possible.

Before generating any new feature, check whether an existing component can be reused or extended.

**CRITICAL CREDIT RULE:**
Never exceed the available daily AI credit limit. Monitor credit usage during generation and stop before reaching the daily limit. If the remaining credit budget is insufficient to complete a feature, prioritize completing and optimizing the existing core functionality instead of starting another expensive feature.

Do not repeatedly regenerate the same UI. Do not create unnecessary variations. Avoid expensive visual generation when a reusable component or simple placeholder will work.

## FINAL QUALITY REQUIREMENT

The final result should look and behave like a complete cloud-based Learning Management System suitable for an HND final-year project demonstration.

Ensure:

* No broken routes
* No obvious dead buttons
* No major console errors
* No overflowing layouts
* No broken mobile screens
* Functional navigation
* Functional forms
* Functional CRUD interactions where applicable
* Consistent responsive behavior
* Realistic demo data
* Clear separation of Student, Instructor, and Administrator experiences

Build the MVP and core functional system first. Only after all core flows work should you spend remaining credits on visual refinements and advanced UI polish.
