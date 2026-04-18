
User wants Supabase connected. Since they declined Lovable Cloud, the alternative is **connecting their own Supabase project** via the standard Supabase integration. This is a different flow — user creates/uses their own Supabase project and we wire it in.

## Plan: Connect Supabase (User's Own Project)

You declined Lovable Cloud, so the alternative is connecting your **own Supabase project** directly. This gives you full control over the Supabase dashboard.

### What I'll do once connected

1. **Wire up Supabase client** — create `src/integrations/supabase/client.ts` with your project URL + publishable key, plus `client.server.ts` for admin operations and `auth-middleware.ts` for protected server functions.

2. **Create database schema** via SQL migrations in your Supabase project:
   - `profiles`, `user_roles` (with `app_role` enum + `has_role()` security-definer function)
   - `categories`, `courses`, `lessons`
   - `enrollments`, `lesson_progress`
   - `quizzes`, `quiz_questions`, `quiz_attempts`
   - RLS policies on every table
   - Trigger to auto-create profile + default `student` role on signup

3. **Storage buckets**: `course-thumbnails`, `lesson-videos`, `avatars` (all public read, authenticated write).

4. **Auth setup**: Email/password with role selection at signup, `onAuthStateChange` listener, redirect rules.

5. **Build the LMS** as per the approved plan (landing → auth → dashboards → builder → learn → admin).

### What you need to do now

Click **Connect Supabase** below. You'll be prompted to:
- Pick an existing Supabase project, OR
- Create a new one (free tier is fine)

Once linked, your project's URL + publishable key + service role key are injected as environment variables and I can start building.

### Note on the first admin

After your first signup, I'll give you a one-line SQL snippet to run in your Supabase SQL editor to promote yourself to `admin`.

---

**Ready?** Approve the connect tool below to link your Supabase project, then I'll switch to build mode and ship phases 1–7 in one go.
