-- 啟用向量擴充套件（pgvector），Supabase 內建支援
create extension if not exists vector with schema extensions;

-- 使用者個人資料：與 Supabase Auth 的 auth.users 一對一
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- 對話列表
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '新對話',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_idx on public.conversations (user_id, updated_at desc);

-- 對話訊息
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- 上傳的文件紀錄
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'text/markdown', 'text/plain')),
  size_bytes integer not null check (size_bytes >= 0),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists documents_user_idx on public.documents (user_id, created_at desc);

-- 文件切片與向量：維度 1536 必須與 EMBEDDING_DIMENSIONS 設定一致
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists document_chunks_user_idx on public.document_chunks (user_id);

-- 使用者的 Prompt 草稿（每人一筆，自動儲存用）
create table if not exists public.prompt_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

-- 常用 Prompt 庫
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompts_user_idx on public.prompts (user_id, updated_at desc);

-- 每日用量統計：Token、上傳數與請求數，用於額度控管
create table if not exists public.usage_daily (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default (now() at time zone 'utc')::date,
  tokens bigint not null default 0 check (tokens >= 0),
  uploads integer not null default 0 check (uploads >= 0),
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

-- 列級安全（RLS）：每張表都只允許使用者存取自己的資料
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.prompt_drafts enable row level security;
alter table public.prompts enable row level security;
alter table public.usage_daily enable row level security;

-- 政策：auth.uid() 等於資料列的擁有者才可讀寫
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "conversations_own" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_own" on public.messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "documents_own" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "document_chunks_own" on public.document_chunks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompt_drafts_own" on public.prompt_drafts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "prompts_own" on public.prompts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "usage_daily_own" on public.usage_daily
  for select using (auth.uid() = user_id);

-- 新使用者註冊時自動建立 profiles 一筆紀錄
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();