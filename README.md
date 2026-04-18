# 🎓 Lumen LMS — Modern Learning Management System

A full-stack Learning Management System where students learn online, instructors create and manage courses, and admins control the entire platform from a powerful dashboard.

> Built with **React**, **Supabase**, **Tailwind CSS**, and **TanStack Start** — powered by **Lovable AI**.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blueviolet?style=for-the-badge)](https://ascend-learn-portal.lovable.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Built with Lovable](https://img.shields.io/badge/Built%20with-Lovable-ff69b4?style=for-the-badge)](https://lovable.dev)

---

## 📸 Screenshots

> _Replace the placeholders below with your actual screenshots (e.g. `docs/screenshots/home.png`)._

| Homepage | Course Catalog |
|---|---|
| ![Homepage](./docs/screenshots/home.png) | ![Catalog](./docs/screenshots/catalog.png) |

| Student Dashboard | Lesson Player |
|---|---|
| ![Student Dashboard](./docs/screenshots/student-dashboard.png) | ![Lesson Player](./docs/screenshots/lesson.png) |

| Instructor Course Builder | Admin Dashboard |
|---|---|
| ![Instructor Builder](./docs/screenshots/instructor-builder.png) | ![Admin Dashboard](./docs/screenshots/admin-dashboard.png) |

---

## ✨ Features

### 👨‍🎓 For Students
- 🔐 Secure email/password authentication
- 📚 Browse, filter, and search courses by category, level, and price
- 🎥 Stream video lessons with progress tracking
- ✅ Auto-saved completion state per lesson
- 📝 Take quizzes with instant scoring
- 🏆 Auto-generated PDF completion certificates
- 👤 Personal profile with avatar upload

### 👩‍🏫 For Instructors
- ➕ Create unlimited courses with rich metadata
- 🎬 Upload lessons (video files or external URLs like YouTube/Vimeo)
- 📊 Drag-and-drop lesson reordering
- ❓ Build quizzes with multiple-choice questions
- 👥 View enrolled students per course
- 📈 Analytics dashboard with quiz performance insights

### 🛠️ For Admins
- 📋 Full user management with role assignment (student / instructor / admin)
- ✅ Course approval workflow
- 🗂️ Category CRUD management
- 🏷️ Discount system (percent or fixed, time-bounded, per-course)
- 🎨 Dynamic homepage CMS — edit hero, banner, and featured courses live
- 📊 Platform-wide stats & insights

### ⚡ Platform
- 🌑 Beautiful dark-mode-first design system
- 📱 Fully responsive (mobile → desktop)
- 🚀 SPA navigation with route preloading
- 🔒 Row-Level Security on every table
- 🎯 Type-safe routing with TanStack Router

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | TanStack Start (React 19 + Vite 7) |
| **Frontend** | React, TypeScript, Tailwind CSS v4 |
| **UI Library** | shadcn/ui + Radix primitives |
| **Backend** | Supabase (Postgres + Auth + Storage) |
| **State / Data** | TanStack Query |
| **Routing** | TanStack Router (file-based) |
| **Built With** | [Lovable AI](https://lovable.dev) |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+ or **Bun** 1.0+
- A **Supabase** project ([create one for free](https://supabase.com))

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/lumen-lms.git
cd lumen-lms
```

### 2. Install dependencies
```bash
bun install
# or
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### 4. Run database migrations
Apply the SQL migrations in `supabase/migrations/` to your Supabase project (via the Supabase CLI or SQL editor).

### 5. Start the dev server
```bash
bun dev
# or
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

### 6. Promote yourself to admin
After signing up, run this in the Supabase SQL editor:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('<your-user-id>', 'admin');
```

---

## 📂 Project Structure

```
src/
├── routes/              # File-based routes (TanStack Router)
│   ├── admin.*          # Admin pages
│   ├── instructor.*     # Instructor pages
│   ├── student.*        # Student pages
│   └── courses.*        # Public course catalog
├── components/          # Reusable UI components
│   └── ui/              # shadcn/ui primitives
├── lib/                 # Utilities, queries, auth
├── hooks/               # Custom React hooks
├── integrations/
│   └── supabase/        # Supabase client + types
└── styles.css           # Design tokens & Tailwind layers
supabase/
└── migrations/          # SQL migrations
```

---

## 🎨 Design System

All colors, gradients, and shadows are defined as semantic tokens in `src/styles.css` using OKLCH color space. No hardcoded colors in components — everything is themeable.

---

## 🗺️ Roadmap

- [ ] Stripe payment integration for paid courses
- [ ] Live discussion threads per lesson
- [ ] Email notifications (course updates, quiz results)
- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to open an issue or submit a PR.

1. Fork the repo
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 💬 Connect

Built with ❤️ using [Lovable](https://lovable.dev).

If you found this project useful, give it a ⭐ on GitHub — it really helps!

**Open to opportunities & collaborations** — feel free to reach out.
