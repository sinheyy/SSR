create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. 정적 카탈로그: 코디템 / 칭호
--    (items가 titles보다 먼저 생성되어야 titles의 FK가 걸림)
-- ------------------------------------------------------------

create table public.items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null check (category in ('hat', 'glasses', 'etc')),
  unlock_condition jsonb,  -- null = 기본 제공 아이템, {"type":"streak","value":3} 형태
  created_at timestamptz default now()
);

create table public.titles (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  condition jsonb not null,           -- {"type":"streak","value":7}
  linked_item_id uuid references public.items(id),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. users : Slack 로그인 시 auth.users 와 1:1로 연결되는 프로필
-- ------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  slack_user_id text unique,
  name text not null,
  email text,
  avatar_url text,
  class text,                                  -- 반, 온보딩에서 입력
  equipped_items jsonb default '{}'::jsonb,     -- { "hat": "<item_id>", "glasses": "<item_id>" }
  unlocked_items uuid[] default '{}',
  mood text default '집중중'
    check (mood in ('집중중', '졸려요', '신남', '피곤')),
  earned_titles uuid[] default '{}',
  equipped_title uuid references public.titles(id),
  total_study_seconds integer default 0,        -- 랭킹용 전체 누적 공부시간
  streak_days integer default 0,                -- 랭킹용 현재 연속 출석일수
  created_at timestamptz default now()
);

-- Slack 로그인으로 auth.users에 새 계정이 생기면
-- public.users 프로필 행을 자동으로 만들어주는 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, slack_user_id, name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'sub',
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 3. tables / seats : 열람실 테이블 · 좌석
-- ------------------------------------------------------------

create table public.tables (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  capacity integer not null check (capacity in (4, 6))
);

create table public.seats (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references public.tables(id) on delete cascade,
  position integer not null check (position >= 0),
  user_id uuid references public.users(id) on delete set null,
  status text check (status in ('공부중', '수업중', '밥먹는중')),
  status_changed_at timestamptz,
  accumulated_study_seconds integer default 0,
  unique (table_id, position)
);

create index idx_seats_table_id on public.seats(table_id);
create index idx_seats_user_id on public.seats(user_id);

-- ------------------------------------------------------------
-- 4. attendance_logs : 일자별 출석/공부시간 기록
-- ------------------------------------------------------------

create table public.attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  total_minutes integer default 0,
  unique (user_id, date)
);

create index idx_attendance_user_date on public.attendance_logs(user_id, date);

-- ------------------------------------------------------------
-- 5. messages : 스터디룸 공개 채팅
-- ------------------------------------------------------------

create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  user_name text not null,
  content text not null,
  created_at timestamptz default now()
);

create index idx_messages_created_at on public.messages(created_at desc);

-- ============================================================
-- 6. Row Level Security (RLS)
--    MVP 단계 기본값입니다. 배포 전 팀원과 함께 한 번 더 점검하세요.
-- ============================================================

alter table public.users enable row level security;
alter table public.tables enable row level security;
alter table public.seats enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.messages enable row level security;
alter table public.items enable row level security;
alter table public.titles enable row level security;

-- users: 로그인한 사람은 전체 프로필을 볼 수 있고(랭킹/좌석 표시용), 본인 것만 수정 가능
create policy "users_select_all" on public.users
  for select using (auth.role() = 'authenticated');
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- tables/items/titles: 정적 카탈로그, 로그인한 사람 누구나 읽기만 가능
create policy "tables_select_all" on public.tables
  for select using (auth.role() = 'authenticated');
create policy "items_select_all" on public.items
  for select using (auth.role() = 'authenticated');
create policy "titles_select_all" on public.titles
  for select using (auth.role() = 'authenticated');

-- seats: 전체 조회 가능, 착석/상태변경/퇴장은 본인 자리만
create policy "seats_select_all" on public.seats
  for select using (auth.role() = 'authenticated');
create policy "seats_update_own_or_empty" on public.seats
  for update using (user_id = auth.uid() or user_id is null);

-- attendance_logs: 본인 기록만 조회/기록 (랭킹은 users.total_study_seconds로 대체)
create policy "attendance_select_own" on public.attendance_logs
  for select using (user_id = auth.uid());
create policy "attendance_insert_own" on public.attendance_logs
  for insert with check (user_id = auth.uid());
create policy "attendance_update_own" on public.attendance_logs
  for update using (user_id = auth.uid());

-- messages: 전체 조회 가능, 본인 명의로만 작성 가능
create policy "messages_select_all" on public.messages
  for select using (auth.role() = 'authenticated');
create policy "messages_insert_own" on public.messages
  for insert with check (user_id = auth.uid());

-- ============================================================
-- 7. 시드 데이터 : 좌석 40석(6인석 4 + 4인석 4) + 코디템/칭호 카탈로그
-- ============================================================

-- 7-1. 테이블 8개 생성
insert into public.tables (name, capacity) values
  ('테이블 1', 6), ('테이블 2', 6), ('테이블 3', 6), ('테이블 4', 6),
  ('테이블 5', 4), ('테이블 6', 4), ('테이블 7', 4), ('테이블 8', 4);

-- 7-2. 각 테이블 capacity만큼 좌석 자동 생성 (총 40석)
insert into public.seats (table_id, position)
select t.id, gs.position
from public.tables t
cross join lateral generate_series(0, t.capacity - 1) as gs(position);

-- 7-3. 코디템 카탈로그 (기본 제공 2종 + 칭호 연동 6종)
insert into public.items (name, category, unlock_condition) values
  ('왕관', 'hat', null),
  ('선글라스', 'glasses', null),
  ('별핀', 'hat', '{"type":"streak","value":3}'),
  ('도트 리본', 'etc', '{"type":"streak","value":7}'),
  ('동그란 안경', 'glasses', '{"type":"streak","value":14}'),
  ('금박 왕관', 'hat', '{"type":"streak","value":30}'),
  ('별자리 망토', 'etc', '{"type":"streak","value":60}'),
  ('도서관장 모자', 'hat', '{"type":"streak","value":100}');

-- 7-4. 칭호 카탈로그 (기획안 3.1 보상 체계 표와 동일)
insert into public.titles (name, condition, linked_item_id) values
  ('꾸준함의 새싹', '{"type":"streak","value":3}', (select id from public.items where name = '별핀')),
  ('일주일 개근', '{"type":"streak","value":7}', (select id from public.items where name = '도트 리본')),
  ('2주 근성러', '{"type":"streak","value":14}', (select id from public.items where name = '동그란 안경')),
  ('한 달 개근왕', '{"type":"streak","value":30}', (select id from public.items where name = '금박 왕관')),
  ('두 달째 정착러', '{"type":"streak","value":60}', (select id from public.items where name = '별자리 망토')),
  ('전설의 도서관장', '{"type":"streak","value":100}', (select id from public.items where name = '도서관장 모자'));
