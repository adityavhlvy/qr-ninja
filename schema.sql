create table if not exists public.links (
  slug text primary key,
  target text not null check (length(target) between 8 and 2048),
  ip_hash text,
  hits bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days'
);

create index if not exists links_expires_at_idx on public.links (expires_at);
create index if not exists links_ip_created_idx on public.links (ip_hash, created_at desc);

-- Expired rows are never served. Delete them from the Neon SQL editor when the
-- table grows, or schedule:
--   delete from public.links where expires_at < now();
