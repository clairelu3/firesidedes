-- Family Story App schema. Paste into Supabase → SQL Editor → Run.
-- Hackathon mode: RLS is off and members are tracked by id in localStorage (no auth).

create extension if not exists "pgcrypto";

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storyteller_name text,
  birth_year int,
  created_at timestamptz default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  role text not null default 'reader' check (role in ('storyteller', 'reader', 'organizer')),
  created_at timestamptz default now()
);

-- Life map: the timeline skeleton every memo attaches to.
create table if not exists life_stages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  label text not null,              -- e.g. "Childhood in Taipei"
  place text,
  start_year int,
  end_year int,
  lived_with text,
  school_or_work text,
  sort_order int default 0
);

-- People roster: lets the AI know "Ah-Ming" is a cousin.
create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  nicknames text[] default '{}',
  relationship text,
  notes text
);

create table if not exists memos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  audio_path text,                  -- path in the "audio" storage bucket
  duration_sec int,
  transcript text,
  language text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'tagged', 'error')),
  error text,
  -- Filled by the process-memo function:
  summary text,
  life_stage_id uuid references life_stages(id) on delete set null,
  place text,
  year_start int,
  year_end int,
  year_is_estimate boolean default true,
  people_ids uuid[] default '{}',
  unmatched_people text[] default '{}',
  events text[] default '{}',
  tone text,
  sensitive boolean default false,
  sensitivity_reason text,
  created_at timestamptz default now()
);

create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  life_stage_id uuid references life_stages(id) on delete cascade,
  title text not null,
  year_range text,
  -- [{ text, memo_ids: uuid[], kind: 'quote' | 'narration' | 'connective', uncertain: bool }]
  sentences jsonb not null default '[]',
  open_questions jsonb not null default '[]',   -- contradictions/gaps phrased as questions for her
  memo_ids uuid[] default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'hidden')),
  audience text not null default 'only_me' check (audience in ('only_me', 'my_kids', 'whole_family', 'future')),
  sensitive boolean default false,
  updated_at timestamptz default now(),
  unique (family_id, life_stage_id)
);

alter table families disable row level security;
alter table members disable row level security;
alter table life_stages disable row level security;
alter table people disable row level security;
alter table memos disable row level security;
alter table chapters disable row level security;

-- Public bucket for voice memos.
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do nothing;

drop policy if exists "audio anon read" on storage.objects;
drop policy if exists "audio anon write" on storage.objects;
create policy "audio anon read" on storage.objects for select using (bucket_id = 'audio');
create policy "audio anon write" on storage.objects for insert with check (bucket_id = 'audio');
