-- DISCOUNTS
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed')),
  value numeric not null check (value >= 0),
  start_date timestamptz,
  end_date timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_discounts_course on public.discounts(course_id);

alter table public.discounts enable row level security;

create policy "Discounts public read"
on public.discounts for select
using (true);

create policy "Admins manage discounts"
on public.discounts for all
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_discounts_updated
before update on public.discounts
for each row execute function public.set_updated_at();

-- HOMEPAGE CONTENT (singleton row)
create table public.homepage_content (
  id uuid primary key default gen_random_uuid(),
  hero_title text not null default 'Learn without limits',
  hero_subtitle text not null default 'Explore expert-led courses and grow your skills.',
  hero_cta_text text not null default 'Browse courses',
  hero_cta_link text not null default '/courses',
  banner_image text,
  featured_course_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.homepage_content enable row level security;

create policy "Homepage content public read"
on public.homepage_content for select
using (true);

create policy "Admins manage homepage content"
on public.homepage_content for all
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

create trigger trg_homepage_updated
before update on public.homepage_content
for each row execute function public.set_updated_at();

-- seed singleton row
insert into public.homepage_content (hero_title, hero_subtitle, hero_cta_text, hero_cta_link)
values ('Learn without limits', 'Explore expert-led courses and grow your skills with Lumen.', 'Browse courses', '/courses');