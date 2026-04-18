-- Roles enum
create type public.app_role as enum ('student', 'instructor', 'admin');

-- TABLES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  thumbnail text,
  category_id uuid references public.categories(id) on delete set null,
  level text not null default 'beginner' check (level in ('beginner','intermediate','advanced')),
  price numeric(10,2) not null default 0,
  is_free boolean not null default true,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_courses_instructor on public.courses(instructor_id);
create index idx_courses_status on public.courses(status);
create index idx_courses_category on public.courses(category_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  video_type text not null default 'url' check (video_type in ('url','upload')),
  duration integer,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_lessons_course on public.lessons(course_id);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  payment_status text not null default 'free' check (payment_status in ('free','paid','pending')),
  unique (user_id, course_id)
);
create index idx_enrollments_user on public.enrollments(user_id);
create index idx_enrollments_course on public.enrollments(course_id);

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (user_id, lesson_id)
);
create index idx_lesson_progress_user on public.lesson_progress(user_id);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  passing_score integer not null default 70,
  created_at timestamptz not null default now()
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index integer not null,
  order_index integer not null default 0
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score integer not null,
  answers jsonb not null,
  submitted_at timestamptz not null default now()
);

-- SECURITY DEFINER role function
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare desired_role public.app_role;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  desired_role := coalesce(
    nullif(new.raw_user_meta_data->>'role','')::public.app_role,
    'student'::public.app_role
  );
  if desired_role = 'admin' then desired_role := 'student'; end if;

  insert into public.user_roles (user_id, role) values (new.id, desired_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

-- Policies: profiles
create policy "Profiles viewable by everyone" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins update any profile" on public.profiles for update using (public.has_role(auth.uid(),'admin'));

-- user_roles
create policy "Users see own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins see all roles" on public.user_roles for select using (public.has_role(auth.uid(),'admin'));
create policy "Admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- categories
create policy "Categories public read" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- courses
create policy "Approved courses public" on public.courses for select using (status = 'approved');
create policy "Instructors see own courses" on public.courses for select using (auth.uid() = instructor_id);
create policy "Admins see all courses" on public.courses for select using (public.has_role(auth.uid(),'admin'));
create policy "Instructors create courses" on public.courses for insert with check (auth.uid() = instructor_id and public.has_role(auth.uid(),'instructor'));
create policy "Instructors update own courses" on public.courses for update using (auth.uid() = instructor_id);
create policy "Admins update any course" on public.courses for update using (public.has_role(auth.uid(),'admin'));
create policy "Instructors delete own courses" on public.courses for delete using (auth.uid() = instructor_id);
create policy "Admins delete any course" on public.courses for delete using (public.has_role(auth.uid(),'admin'));

-- lessons
create policy "Lessons viewable for approved courses" on public.lessons for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.status = 'approved' or c.instructor_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "Instructors manage own lessons" on public.lessons for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- enrollments
create policy "Users see own enrollments" on public.enrollments for select using (auth.uid() = user_id);
create policy "Instructors see enrollments of their courses" on public.enrollments for select using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);
create policy "Admins see all enrollments" on public.enrollments for select using (public.has_role(auth.uid(),'admin'));
create policy "Users enroll themselves" on public.enrollments for insert with check (auth.uid() = user_id);
create policy "Users delete own enrollments" on public.enrollments for delete using (auth.uid() = user_id);

-- lesson_progress
create policy "Users see own progress" on public.lesson_progress for select using (auth.uid() = user_id);
create policy "Instructors see progress on their lessons" on public.lesson_progress for select using (
  exists (select 1 from public.lessons l join public.courses c on c.id = l.course_id where l.id = lesson_id and c.instructor_id = auth.uid())
);
create policy "Users insert own progress" on public.lesson_progress for insert with check (auth.uid() = user_id);
create policy "Users update own progress" on public.lesson_progress for update using (auth.uid() = user_id);

-- quizzes
create policy "Quizzes viewable for approved courses" on public.quizzes for select using (
  exists (select 1 from public.courses c where c.id = course_id and (c.status='approved' or c.instructor_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "Instructors manage own quizzes" on public.quizzes for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
) with check (
  exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid())
);

-- quiz_questions
create policy "Questions viewable when quiz visible" on public.quiz_questions for select using (
  exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and (c.status='approved' or c.instructor_id = auth.uid() or public.has_role(auth.uid(),'admin')))
);
create policy "Instructors manage own quiz questions" on public.quiz_questions for all using (
  exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and c.instructor_id = auth.uid())
) with check (
  exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and c.instructor_id = auth.uid())
);

-- quiz_attempts
create policy "Users see own attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "Instructors see attempts on their quizzes" on public.quiz_attempts for select using (
  exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and c.instructor_id = auth.uid())
);
create policy "Users insert own attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values
  ('course-thumbnails','course-thumbnails', true),
  ('lesson-videos','lesson-videos', true),
  ('avatars','avatars', true)
on conflict (id) do nothing;

create policy "Public read thumbnails" on storage.objects for select using (bucket_id = 'course-thumbnails');
create policy "Auth upload thumbnails" on storage.objects for insert with check (bucket_id = 'course-thumbnails' and auth.uid() is not null);
create policy "Owner update thumbnails" on storage.objects for update using (bucket_id = 'course-thumbnails' and owner = auth.uid());
create policy "Owner delete thumbnails" on storage.objects for delete using (bucket_id = 'course-thumbnails' and owner = auth.uid());

create policy "Public read videos" on storage.objects for select using (bucket_id = 'lesson-videos');
create policy "Auth upload videos" on storage.objects for insert with check (bucket_id = 'lesson-videos' and auth.uid() is not null);
create policy "Owner update videos" on storage.objects for update using (bucket_id = 'lesson-videos' and owner = auth.uid());
create policy "Owner delete videos" on storage.objects for delete using (bucket_id = 'lesson-videos' and owner = auth.uid());

create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Auth upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
create policy "Owner update avatars" on storage.objects for update using (bucket_id = 'avatars' and owner = auth.uid());
create policy "Owner delete avatars" on storage.objects for delete using (bucket_id = 'avatars' and owner = auth.uid());

-- Seed categories
insert into public.categories (name, slug, icon) values
  ('Web Development','web-development','code'),
  ('Data Science','data-science','bar-chart-3'),
  ('Design','design','palette'),
  ('Business','business','briefcase'),
  ('Marketing','marketing','megaphone'),
  ('Photography','photography','camera')
on conflict (name) do nothing;