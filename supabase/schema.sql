create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- 1. 정적 카탈로그: 코디템 / 칭호
--    (items가 titles보다 먼저 생성되어야 titles의 FK가 걸림)
-- ------------------------------------------------------------

create table public.items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
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
    check (mood in ('집중중', '졸려요', '신나요', '피곤해요', '배고파요')),
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
  total_seconds integer default 0,
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

-- 7-3. 코디템 카탈로그 (전부 해금 조건 있음 — 기본 제공 아이템 없음)
insert into public.items (name, unlock_condition) values
  ('왕관', '{"type":"streak","value":1}'),
  ('선글라스', '{"type":"streak","value":2}'),
  ('별핀', '{"type":"streak","value":3}'),
  ('도트 리본', '{"type":"streak","value":7}'),
  ('동그란 안경', '{"type":"streak","value":14}'),
  ('금박 왕관', '{"type":"streak","value":30}'),
  ('별자리 망토', '{"type":"streak","value":60}'),
  ('도서관장 모자', '{"type":"streak","value":100}');

-- 7-4. 칭호 카탈로그 (기획안 3.1 보상 체계 표와 동일)
insert into public.titles (name, condition, linked_item_id) values
  ('꾸준함의 새싹', '{"type":"streak","value":3}', (select id from public.items where name = '별핀')),
  ('일주일 개근', '{"type":"streak","value":7}', (select id from public.items where name = '도트 리본')),
  ('2주 근성러', '{"type":"streak","value":14}', (select id from public.items where name = '동그란 안경')),
  ('한 달 개근왕', '{"type":"streak","value":30}', (select id from public.items where name = '금박 왕관')),
  ('두 달째 정착러', '{"type":"streak","value":60}', (select id from public.items where name = '별자리 망토')),
  ('전설의 도서관장', '{"type":"streak","value":100}', (select id from public.items where name = '도서관장 모자'));

-- ------------------------------------------------------------
-- (1회성) attendance_logs.total_minutes -> total_seconds 컬럼명 변경
--    이미 total_seconds로 되어 있다면 이 줄은 건너뛰고 아래부터 실행하세요.
-- ------------------------------------------------------------
alter table public.attendance_logs rename column total_minutes to total_seconds;

-- ============================================================
-- 8. 좌석 착석/퇴장 RPC
--    클라이언트에서 seats를 직접 update하면 "기존 자리 비우기 + 새 자리 앉기"를
--    원자적으로 처리할 수 없어서(동시 클릭 시 두 자리에 걸치는 상태가 될 수 있음)
--    서버 함수로 묶어서 처리합니다.
--
--    좌석을 옮기거나 퇴장할 때, 그 직전까지 앉아있던 구간의 시간을
--    attendance_logs(오늘 누적)와 users.total_study_seconds(전체 누적)에
--    정산해서 더해줘야 자리를 옮겨도 공부시간이 초기화되지 않습니다.
-- ============================================================

create or replace function public.settle_current_seat()
returns void
language plpgsql
security invoker
as $$
declare
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select greatest(0, extract(epoch from (now() - status_changed_at))::integer)
  into elapsed
  from public.seats
  where user_id = auth.uid() and status_changed_at is not null;

  if elapsed is null or elapsed = 0 then
    return;
  end if;

  insert into public.attendance_logs (user_id, date, total_seconds)
  values (auth.uid(), today, elapsed)
  on conflict (user_id, date)
  do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

  update public.users
  set total_study_seconds = total_study_seconds + elapsed
  where id = auth.uid();
end;
$$;

create or replace function public.sit_at_seat(target_seat_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  -- 자리를 옮기는 경우, 기존 자리에 앉아있던 시간부터 정산
  perform public.settle_current_seat();

  -- 기존에 앉아있던 자리가 있으면 비우기
  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = auth.uid();

  -- 새 자리에 착석 (이미 다른 사람이 앉아있으면 실패)
  update public.seats
  set user_id = auth.uid(), status_changed_at = now()
  where id = target_seat_id and user_id is null;

  if not found then
    raise exception '이미 다른 사람이 앉아있는 자리입니다';
  end if;
end;
$$;

create or replace function public.leave_seat()
returns void
language plpgsql
security invoker
as $$
begin
  perform public.settle_current_seat();

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = auth.uid();
end;
$$;

grant execute on function public.settle_current_seat() to authenticated;
grant execute on function public.sit_at_seat(uuid) to authenticated;
grant execute on function public.leave_seat() to authenticated;

-- ============================================================
-- 9. Realtime 구독 활성화
--    다른 사람이 착석/퇴장할 때 모든 화면에 즉시 반영되려면 seats
--    테이블이 supabase_realtime publication에 포함돼 있어야 합니다.
--    이미 추가돼 있다면 "already member of publication" 에러가 나는데,
--    이미 설정됐다는 뜻이니 무시해도 됩니다.
-- ============================================================

alter publication supabase_realtime add table public.seats;

-- ============================================================
-- 10. custom_items : 유저가 옷장 드로어에서 직접 그린 코디템
--    Storage 버킷 없이 base64 PNG를 텍스트로 저장 (MVP, 캔버스가 작아서
--    이미지 용량도 작음 — 나중에 커지면 Storage로 옮기는 걸 검토)
-- ============================================================

create table public.custom_items (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  image text not null, -- data:image/png;base64,... 형태
  created_at timestamptz default now()
);

create index idx_custom_items_owner on public.custom_items(owner_id);

-- worn_items: 그린 아이템/보상 아이템을 구분 없이 하나의 리스트로 착용 관리.
-- [{ "source": "custom"|"catalog", "item_id": "<uuid>", "x": 50, "y": 30 }, ...]
-- x/y는 캐릭터 미리보기 기준 0~100 비율 좌표 (드로어에서 드래그로 조정)
-- 기존 equipped_items(jsonb)는 그대로 남겨두지만 이 기능에서는 안 씁니다.
alter table public.users
  add column worn_items jsonb default '[]'::jsonb;

alter table public.custom_items enable row level security;

-- custom_items: 전체 조회 가능(남 화면에도 보여야 함), 본인 명의로만 생성/삭제
create policy "custom_items_select_all" on public.custom_items
  for select using (auth.role() = 'authenticated');
create policy "custom_items_insert_own" on public.custom_items
  for insert with check (owner_id = auth.uid());
create policy "custom_items_delete_own" on public.custom_items
  for delete using (owner_id = auth.uid());

-- users 테이블도 realtime에 추가 — worn_items가 바뀌면 다른 사람 화면의
-- 좌석 그리드도 갱신되어야 함
alter publication supabase_realtime add table public.users;

-- avatar_color: 옷장에서 고른 캐릭터 색 프리셋. lib/avatar-color.ts의
-- AVATAR_COLORS 배열 값(Tailwind 클래스 문자열) 중 하나를 그대로 저장.
-- null이면 기존처럼 userId 해시로 색이 자동 정해짐.
alter table public.users
  add column avatar_color text;

-- ============================================================
-- 11. 브라우저 종료 시 자동 퇴장 (Presence)
--    Supabase Realtime Presence는 클라이언트끼리만 아는 상태라 DB 트리거를
--    걸 수 없습니다. 대신 접속해있는 다른 클라이언트가 "이 유저가 방금
--    연결이 끊겼다"는 presence leave 이벤트를 감지해서 이 함수를 호출해
--    그 유저의 좌석을 정산 후 비웁니다.
--
--    본인 좌석이 아닌 남의 좌석을 지울 수 있어야 해서 security definer로
--    RLS를 우회합니다. (내부 로직이 target_user_id로만 동작하도록 고정돼
--    있어서 임의 SQL 실행 등의 위험은 없지만, 로그인한 사람이면 누구나
--    아무 좌석이나 비울 수 있다는 점은 감안하세요 — 소규모 내부 도구라
--    이 정도 신뢰 수준으로 충분하다고 판단했습니다.)
-- ============================================================

create or replace function public.clear_seat_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select greatest(0, extract(epoch from (now() - status_changed_at))::integer)
  into elapsed
  from public.seats
  where user_id = target_user_id and status_changed_at is not null;

  if elapsed is not null and elapsed > 0 then
    insert into public.attendance_logs (user_id, date, total_seconds)
    values (target_user_id, today, elapsed)
    on conflict (user_id, date)
    do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

    update public.users
    set total_study_seconds = total_study_seconds + elapsed
    where id = target_user_id;
  end if;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = target_user_id;
end;
$$;

grant execute on function public.clear_seat_for_user(uuid) to authenticated;

-- ============================================================
-- 12. 연속 출석일(streak_days) 자동 계산
--    attendance_logs에 "그 날 공부 기록"이 쌓이는 시점(정산 시점)마다
--    오늘부터 거슬러 며칠 연속으로 공부 기록이 있는지 다시 세어
--    users.streak_days에 반영합니다. 오늘 기록이 아직 없으면(=아직
--    한 번도 정산 안 됨) 어제까지의 연속 기록으로 계산하므로, 자정이
--    지나자마자 스트릭이 0으로 끊겨 보이지 않습니다.
-- ============================================================

create or replace function public.recompute_streak(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  streak integer := 0;
  cursor_date date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not exists (
    select 1 from public.attendance_logs
    where user_id = target_user_id and date = cursor_date and total_seconds > 0
  ) then
    cursor_date := cursor_date - 1;
  end if;

  while exists (
    select 1 from public.attendance_logs
    where user_id = target_user_id and date = cursor_date and total_seconds > 0
  ) loop
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  update public.users set streak_days = streak where id = target_user_id;
end;
$$;

grant execute on function public.recompute_streak(uuid) to authenticated;

-- settle_current_seat / clear_seat_for_user가 attendance_logs를 갱신한
-- 직후 streak도 같이 재계산하도록 재정의
create or replace function public.settle_current_seat()
returns void
language plpgsql
security invoker
as $$
declare
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select greatest(0, extract(epoch from (now() - status_changed_at))::integer)
  into elapsed
  from public.seats
  where user_id = auth.uid() and status_changed_at is not null;

  if elapsed is null or elapsed = 0 then
    return;
  end if;

  insert into public.attendance_logs (user_id, date, total_seconds)
  values (auth.uid(), today, elapsed)
  on conflict (user_id, date)
  do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

  update public.users
  set total_study_seconds = total_study_seconds + elapsed
  where id = auth.uid();

  perform public.recompute_streak(auth.uid());
end;
$$;

create or replace function public.clear_seat_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select greatest(0, extract(epoch from (now() - status_changed_at))::integer)
  into elapsed
  from public.seats
  where user_id = target_user_id and status_changed_at is not null;

  if elapsed is not null and elapsed > 0 then
    insert into public.attendance_logs (user_id, date, total_seconds)
    values (target_user_id, today, elapsed)
    on conflict (user_id, date)
    do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

    update public.users
    set total_study_seconds = total_study_seconds + elapsed
    where id = target_user_id;

    perform public.recompute_streak(target_user_id);
  end if;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = target_user_id;
end;
$$;

-- ------------------------------------------------------------
-- (1회성) 기존 유저들 streak_days 한 번 백필
--    이미 위 함수들이 적용된 뒤로 계속 정산되고 있었다면 이 줄은
--    건너뛰어도 됩니다.
-- ------------------------------------------------------------
select public.recompute_streak(id) from public.users;

-- ------------------------------------------------------------
-- (1회성) mood 값 변경: 신남 -> 신나요, 피곤 -> 피곤해요, 배고파요 추가
--    기존 데이터부터 새 값으로 바꾼 뒤에 체크 제약을 갈아끼웁니다
--    (순서를 바꾸면 기존 '신남'/'피곤' 행에서 제약 위반이 납니다).
-- ------------------------------------------------------------
update public.users set mood = '신나요' where mood = '신남';
update public.users set mood = '피곤해요' where mood = '피곤';

alter table public.users drop constraint if exists users_mood_check;
alter table public.users
  add constraint users_mood_check
  check (mood in ('집중중', '졸려요', '신나요', '피곤해요', '배고파요'));

-- ============================================================
-- 13. 문의/건의 (feedback)
--    관리자 여부는 별도 role 체계 없이 users.is_admin 플래그 하나로 관리
--    (소규모 내부 도구라 이 정도면 충분 — 관리자 지정은 Supabase에서
--    해당 유저 행의 is_admin을 수동으로 true로 바꿔주면 됩니다).
-- ============================================================

alter table public.users
  add column is_admin boolean default false;

create table public.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  user_name text not null,
  title text not null,
  content text not null,
  reply text,
  replied_at timestamptz,
  created_at timestamptz default now()
);

create index idx_feedback_user_id on public.feedback(user_id);

alter table public.feedback enable row level security;

-- feedback: 본인 것만 조회 가능하되, 관리자는 전체 조회 가능
create policy "feedback_select_own_or_admin" on public.feedback
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

-- feedback: 본인 명의로만 새 문의 작성 가능
create policy "feedback_insert_own" on public.feedback
  for insert with check (user_id = auth.uid());

-- feedback: 관리자만 답변(수정) 가능
create policy "feedback_update_admin" on public.feedback
  for update using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

-- 문의 남기면 관리자 화면에, 답변 달리면 사용자 화면에 실시간 반영
alter publication supabase_realtime add table public.feedback;

-- ------------------------------------------------------------
-- (1회성) feedback에 문의 유형(type) 추가, 본인 글 수정/삭제 허용
--    수정은 아직 답변이 안 달린 글만 가능 (답변 후 내용이 바뀌면
--    답변이랑 안 맞게 되니까), 삭제는 답변 여부와 상관없이 항상 가능.
-- ------------------------------------------------------------
alter table public.feedback
  add column type text not null default '기타'
  check (type in ('버그 신고', '기능 제안', '사용 문의', '기타'));

create policy "feedback_update_own_unanswered" on public.feedback
  for update using (user_id = auth.uid() and reply is null)
  with check (user_id = auth.uid());

create policy "feedback_delete_own" on public.feedback
  for delete using (user_id = auth.uid());
