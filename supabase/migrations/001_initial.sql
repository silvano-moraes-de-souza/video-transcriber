create extension if not exists pgcrypto;

create table if not exists public.transcription_jobs (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  platform text not null default 'generic',
  status text not null default 'queued' check (status in ('queued','downloading','extracting','transcribing','completed','failed')),
  progress integer not null default 0 check (progress between 0 and 100),
  error text,
  access_token text not null,
  request_hash text not null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.transcription_jobs(id) on delete cascade,
  text text not null,
  language text,
  duration numeric,
  segments jsonb,
  created_at timestamptz not null default now()
);

create index if not exists transcription_jobs_status_idx on public.transcription_jobs(status, created_at);
create index if not exists transcription_jobs_request_hash_idx on public.transcription_jobs(request_hash, created_at);

alter table public.transcription_jobs enable row level security;
alter table public.transcripts enable row level security;

revoke all on public.transcription_jobs from anon, authenticated;
revoke all on public.transcripts from anon, authenticated;
