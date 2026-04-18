-- Replace the instructor-only INSERT policy with one that also allows admins
drop policy if exists "Instructors create courses" on public.courses;

create policy "Instructors or admins create courses"
on public.courses
for insert
to authenticated
with check (
  (auth.uid() = instructor_id)
  and (
    public.has_role(auth.uid(), 'instructor'::public.app_role)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);