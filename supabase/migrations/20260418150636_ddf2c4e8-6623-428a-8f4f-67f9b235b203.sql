drop policy if exists "Public read thumbnails" on storage.objects;
drop policy if exists "Public read videos" on storage.objects;
drop policy if exists "Public read avatars" on storage.objects;

-- Allow listing only for owners or admins; public direct-URL access still works because buckets are public.
create policy "Owners list thumbnails" on storage.objects for select using (
  bucket_id = 'course-thumbnails' and (owner = auth.uid() or public.has_role(auth.uid(),'admin'))
);
create policy "Owners list videos" on storage.objects for select using (
  bucket_id = 'lesson-videos' and (owner = auth.uid() or public.has_role(auth.uid(),'admin'))
);
create policy "Owners list avatars" on storage.objects for select using (
  bucket_id = 'avatars' and (owner = auth.uid() or public.has_role(auth.uid(),'admin'))
);