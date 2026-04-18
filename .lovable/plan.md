
# Full LMS Platform — Midnight Indigo

আমি একটি production-ready LMS তৈরি করব Lovable Cloud (Supabase) backend দিয়ে, dark "Midnight Indigo" theme সহ।

## 🎨 Design System
- **Palette**: Deep navy `#0a0a1a` background, `#141432` surfaces, electric indigo `#4f46e5` primary
- **Typography**: Space Grotesk (headings) + Inter (body) — modern tech SaaS feel
- **Layout**: Card-based courses, sidebar dashboard, glassmorphic accents
- **Responsive**: Mobile-first, sidebar collapses to hamburger on tablet/mobile

## 🗂 Routes Structure
**Public**
- `/` — Landing (hero, featured courses, categories, testimonials, CTA)
- `/courses` — Browse all courses (search + filter by category/level/price)
- `/courses/$courseId` — Course detail (curriculum, instructor, enroll button)
- `/login`, `/signup` — Auth pages with role selection (Student/Instructor)

**Student dashboard** (`/_auth/student/*`)
- `dashboard` — Enrolled courses + progress overview
- `learn/$courseId/$lessonId` — Video player + lesson sidebar + mark complete
- `quizzes/$quizId` — Take quiz / view results
- `profile` — Settings

**Instructor dashboard** (`/_auth/instructor/*`)
- `dashboard` — My courses, enrollment stats
- `courses/new`, `courses/$id/edit` — Course builder
- `courses/$id/lessons` — Add/edit lessons (video URL or upload)
- `courses/$id/quizzes` — Build quizzes (MCQ)
- `courses/$id/students` — Enrolled students + progress

**Admin dashboard** (`/_auth/admin/*`)
- `dashboard` — Total users/courses/enrollments stats
- `users` — Approve/remove instructors, manage students
- `courses` — Approve/reject pending courses

## 🗄 Database (Lovable Cloud)
- `profiles` — id, full_name, avatar_url, bio
- `user_roles` — user_id, role (`student` | `instructor` | `admin`) — separate table for RLS safety
- `courses` — id, title, slug, description, thumbnail, category, level, price, is_free, instructor_id, status (`pending`/`approved`/`rejected`), created_at
- `lessons` — id, course_id, title, description, video_url, video_type (`url`/`upload`), duration, order_index
- `enrollments` — id, user_id, course_id, enrolled_at, payment_status
- `lesson_progress` — id, user_id, lesson_id, completed, completed_at
- `quizzes` — id, course_id, title, passing_score
- `quiz_questions` — id, quiz_id, question, options (jsonb), correct_index
- `quiz_attempts` — id, user_id, quiz_id, score, answers (jsonb), submitted_at
- `categories` — id, name, slug, icon

**Storage buckets**: `course-thumbnails` (public), `lesson-videos` (public), `avatars` (public)

**Security**: RLS on every table. `has_role(uid, role)` security-definer function. Students see only their own enrollments/progress; instructors manage only their own courses; admins have full access.

## 🔐 Auth & Roles
- Email/password signup with role selection at signup (student/instructor)
- Auto-create `profile` row + insert into `user_roles` via DB trigger
- Instructors start as `pending` until admin approval (configurable)
- Route guards via `_auth` layout + role-specific layouts that redirect unauthorized users
- First admin: manually promoted via SQL after signup (I'll provide the snippet)

## 💳 Payments
- Free + Paid courses both supported in schema (`is_free`, `price` columns)
- Free courses: instant enroll on click
- Paid courses: "Buy" button (Stripe checkout flow can be wired in a follow-up phase using Lovable's built-in payments)

## 🎬 Video
- Instructor chooses: paste YouTube/Vimeo URL **or** upload to Supabase Storage
- Player auto-detects type — embeds iframe for URLs, native `<video>` for uploads

## 📊 Progress & Quizzes
- "Mark as complete" per lesson → updates `lesson_progress`
- Course progress % = completed lessons / total lessons
- MCQ quizzes with auto-grading, attempt history, pass/fail badge

## 🧩 Reusable Components
`CourseCard`, `LessonItem`, `VideoPlayer`, `ProgressBar`, `RoleGuard`, `DashboardSidebar`, `StatsCard`, `QuizQuestion`, `EmptyState`

## 🚀 Build Phases (single delivery, organized internally)
1. Cloud setup + schema + RLS + storage buckets + roles
2. Auth pages + role-based routing + dashboard shells
3. Public landing + course browse + detail
4. Instructor: course/lesson/quiz builder with video upload
5. Student: enroll, learn page, progress, quiz taking
6. Admin: approvals + user management
7. Polish: dark theme tuning, animations, empty states, mobile sidebar
