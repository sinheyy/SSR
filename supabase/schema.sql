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

-- 조건 달성형(streak/total_hours) 아이템 자동 해금.
-- streak_days/total_study_seconds가 바뀌는 시점(정산 시)마다 호출해서,
-- 조건을 만족하는데 아직 unlocked_items에 없는 아이템을 채워준다.
-- (아이템이 새로 만들어지거나 조건이 나중에 바뀌는 경우까지는 커버하지
-- 않음 — 그런 경우는 다음 정산 때 자연스럽게 잡힘)
create or replace function public.check_unlocks(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_streak integer;
  cur_seconds integer;
  cur_unlocked uuid[];
  newly_unlocked uuid[];
begin
  select streak_days, total_study_seconds, unlocked_items
  into cur_streak, cur_seconds, cur_unlocked
  from public.users
  where id = target_user_id;

  select array_agg(id) into newly_unlocked
  from public.items
  where not (id = any(cur_unlocked))
    and (
      (unlock_condition->>'type' = 'streak'
        and cur_streak >= (unlock_condition->>'value')::int)
      or
      (unlock_condition->>'type' = 'total_hours'
        and cur_seconds >= (unlock_condition->>'value')::int * 3600)
    );

  if newly_unlocked is not null then
    update public.users
    set unlocked_items = unlocked_items || newly_unlocked
    where id = target_user_id;
  end if;
end;
$$;

grant execute on function public.check_unlocks(uuid) to authenticated;

-- settle_current_seat / clear_seat_for_user가 attendance_logs를 갱신한
-- 직후 streak/아이템 해금도 같이 재계산하도록 재정의
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
  perform public.check_unlocks(auth.uid());
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
    perform public.check_unlocks(target_user_id);
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

-- ------------------------------------------------------------
-- (1회성) 스터디룸에 기분 상태 표시 여부 설정
--    users_update_own 정책이 이미 있어서 본인 컬럼 수정은 그대로 허용됨.
-- ------------------------------------------------------------
alter table public.users
  add column show_mood boolean default true;

-- ------------------------------------------------------------
-- 벽에 걸린 화이트보드 : 스터디룸 전체가 함께 쓰는 단일 캔버스
--    Storage 버킷 없이 base64 PNG를 텍스트로 저장 (코디템 그리기와 동일한
--    방식). 여러 명이 동시에 그릴 때는 그림을 다 그리고 손을 뗀 시점(획이
--    끝날 때)마다 캔버스 전체를 덮어써서 저장하는 방식이라, 두 명이 정확히
--    같은 순간에 그리면 나중에 저장한 사람이 이긴다 — 소규모 인원 캐주얼
--    낙서용이라 이 정도로 충분하다고 판단. 동시 편집 충돌이 실제로 문제되면
--    획 단위 Realtime Broadcast로 업그레이드 검토.
-- ------------------------------------------------------------

create table public.whiteboard (
  id text primary key default 'main',
  image text,
  updated_at timestamptz default now()
);

insert into public.whiteboard (id, image) values ('main', null);

alter table public.whiteboard enable row level security;

create policy "whiteboard_select_all" on public.whiteboard
  for select using (auth.role() = 'authenticated');
create policy "whiteboard_update_all" on public.whiteboard
  for update using (auth.role() = 'authenticated');

alter publication supabase_realtime add table public.whiteboard;

-- ============================================================
-- 15. 평일 업무시간(09:00~17:50) 공부시간 카운트 제외
--    이 시간대는 이미 SKALA 정규 교육 시간이라 스터디룸 공부시간에
--    안 잡히게, 착석 구간과 겹치는 부분만 정산 시 빼고 기록합니다.
-- ============================================================

create or replace function public.excluded_seconds(range_start timestamptz, range_end timestamptz)
returns integer
language plpgsql
as $$
declare
  total_excluded integer := 0;
  day_cursor date;
  last_day date;
  excl_start timestamptz;
  excl_end timestamptz;
  overlap_start timestamptz;
  overlap_end timestamptz;
begin
  if range_end <= range_start then
    return 0;
  end if;

  day_cursor := (range_start at time zone 'Asia/Seoul')::date;
  last_day := (range_end at time zone 'Asia/Seoul')::date;

  while day_cursor <= last_day loop
    -- isodow: 1=월요일 ... 5=금요일, 6/7=주말
    if extract(isodow from day_cursor) between 1 and 5 then
      excl_start := (day_cursor + time '09:00:00') at time zone 'Asia/Seoul';
      excl_end := (day_cursor + time '17:50:00') at time zone 'Asia/Seoul';

      overlap_start := greatest(range_start, excl_start);
      overlap_end := least(range_end, excl_end);

      if overlap_end > overlap_start then
        total_excluded := total_excluded + extract(epoch from (overlap_end - overlap_start))::integer;
      end if;
    end if;

    day_cursor := day_cursor + 1;
  end loop;

  return total_excluded;
end;
$$;


-- settle_current_seat / clear_seat_for_user가 정산할 때 평일 09:00~17:50과
-- 겹치는 시간을 빼고 기록하도록 재정의. streak/아이템 자동 해금 체크도 같이 호출.
create or replace function public.settle_current_seat()
returns void
language plpgsql
security invoker
as $$
declare
  since timestamptz;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select status_changed_at into since
  from public.seats
  where user_id = auth.uid() and status_changed_at is not null;

  if since is null then
    return;
  end if;

  elapsed := greatest(0, extract(epoch from (now() - since))::integer - public.excluded_seconds(since, now()));

  if elapsed = 0 then
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
  perform public.check_unlocks(auth.uid());
end;
$$;

create or replace function public.clear_seat_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select status_changed_at into since
  from public.seats
  where user_id = target_user_id and status_changed_at is not null;

  if since is not null then
    elapsed := greatest(0, extract(epoch from (now() - since))::integer - public.excluded_seconds(since, now()));

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (target_user_id, today, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = target_user_id;

      perform public.recompute_streak(target_user_id);
      perform public.check_unlocks(target_user_id);
    end if;
  end if;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = target_user_id;
end;
$$;

-- ============================================================
-- 16. 평일 업무시간(09:00~17:50)에는 착석 자체를 막고, 그 시간이
--     시작되는 시점에 이미 앉아있던 사람은 자동으로 퇴장시킵니다.
-- ============================================================

create or replace function public.is_within_excluded_hours()
returns boolean
language plpgsql
as $$
declare
  seoul_now timestamp := now() at time zone 'Asia/Seoul';
begin
  return extract(isodow from seoul_now) between 1 and 5
    and seoul_now::time >= time '09:00:00'
    and seoul_now::time < time '17:50:00';
end;
$$;

-- sit_at_seat: 업무시간에는 착석 자체를 거부
create or replace function public.sit_at_seat(target_seat_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if public.is_within_excluded_hours() then
    raise exception '평일 09:00~17:50에는 착석할 수 없습니다';
  end if;

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

-- 업무시간이 시작되는 시점에 이미 앉아있던 사람들을 정산 후 일괄 퇴장.
-- 클라이언트가 업무시간 진입을 감지했을 때 호출 — 이미 비어있으면
-- 그냥 아무 일도 안 하니 여러 클라이언트가 동시에 불러도 안전합니다.
create or replace function public.clear_seats_for_excluded_hours()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied record;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.is_within_excluded_hours() then
    return;
  end if;

  for occupied in
    select user_id, status_changed_at
    from public.seats
    where user_id is not null and status_changed_at is not null
  loop
    elapsed := greatest(
      0,
      extract(epoch from (now() - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, now())
    );

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (occupied.user_id, today, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;
  end loop;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id is not null;
end;
$$;

grant execute on function public.is_within_excluded_hours() to authenticated;
grant execute on function public.clear_seats_for_excluded_hours() to authenticated;

-- ------------------------------------------------------------
-- 명예형 아이템 : 관리자가 그려서 만드는 코디템
--    조건 달성형(스트릭 등 조건 충족 시 자동 해금)과 지급형(조건 없이
--    특정 유저에게 직접 지급) 두 가지로 만든다. 지급형은 unlock_condition을
--    null이 아닌 {"type":"manual"}로 넣어서 "condition null = 전체 공개"
--    필터에 걸리지 않게 하고, 실제 지급은 grant_item()으로 그 유저의
--    unlocked_items에 직접 넣어준다.
-- ------------------------------------------------------------

alter table public.items
  add column image text; -- data:image/png;base64,... (없으면 기존처럼 텍스트 칩으로 표시)

create policy "items_insert_admin" on public.items
  for insert with check (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

create policy "items_update_admin" on public.items
  for update using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

create policy "items_delete_admin" on public.items
  for delete using (
    exists (
      select 1 from public.users where id = auth.uid() and is_admin = true
    )
  );

-- 아이템 삭제 시 이미 착용/해금한 유저들에게 남는 유령 참조까지 같이 정리.
-- 단순 delete만 하면 worn_items/unlocked_items에 죽은 id가 남아서 캐릭터
-- 위에 "아이템"이라는 이름 없는 텍스트 뱃지가 계속 떠 있게 됨.
create or replace function public.delete_item(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 아이템을 삭제할 수 있습니다';
  end if;

  update public.users
  set worn_items = (
    select coalesce(jsonb_agg(elem), '[]'::jsonb)
    from jsonb_array_elements(worn_items) elem
    where not (
      elem->>'source' = 'catalog'
      and elem->>'item_id' = target_item_id::text
    )
  )
  where true; -- Supabase가 WHERE 없는 UPDATE를 막아서 문법상 채움(전체 대상 의도 유지)

  update public.users
  set unlocked_items = array_remove(unlocked_items, target_item_id)
  where true;

  delete from public.items where id = target_item_id;
end;
$$;

grant execute on function public.delete_item(uuid) to authenticated;

-- 관리자가 특정 유저에게 아이템을 직접 지급 (unlocked_items에 추가).
-- users_update_own 정책으로는 남의 행을 못 고치므로 security definer로 우회.
create or replace function public.grant_item(target_user_id uuid, target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users where id = auth.uid() and is_admin = true) then
    raise exception '관리자만 아이템을 지급할 수 있습니다';
  end if;

  update public.users
  set unlocked_items = array_append(unlocked_items, target_item_id)
  where id = target_user_id
    and not (target_item_id = any(unlocked_items));
end;
$$;

grant execute on function public.grant_item(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 칭호(titles) 시스템 제거
--    titles.linked_item_id가 items를 FK로 참조하고 있어서 관리자가
--    아이템을 지우려 할 때 칭호에 연결된 것들만 막히는 문제가 있었음.
--    칭호 자체를 없애기로 해서 관련 컬럼/테이블을 통째로 정리.
--    equipped_title 컬럼을 먼저 지워야 그 FK가 같이 없어지고, 그 다음
--    titles 테이블을 지우면 linked_item_id FK도 같이 사라져서 items
--    삭제가 더 이상 칭호 때문에 막히지 않음.
-- ------------------------------------------------------------

alter table public.users drop column if exists equipped_title;
alter table public.users drop column if exists earned_titles;
drop table if exists public.titles;

-- ============================================================
-- 17. 좌석 하트비트 + 서버 사이드 자동 정리(sweep)
--    브라우저 탭을 그냥 닫으면(beforeunload 등 핸들러가 없음) leave_seat이
--    호출되지 않고, Presence "leave" 이벤트로 clear_seat_for_user를
--    호출하는 것도 그 순간 study-room 채널에 접속해있는 "다른" 클라이언트
--    에게 의존합니다. 그 순간 아무도 접속해있지 않으면 좌석이 DB에 영구히
--    "착석 중"으로 남고, status_changed_at을 기준으로 실시간 공부시간을
--    계산하는 위젯도 그 오래된 시각부터 지금까지를 전부 공부 중으로
--    잘못 표시합니다 (예: 며칠 전에 앉은 좌석이면 "41시간 44분"처럼 표시).
--
--    해결: 좌석에 앉아있는 동안 클라이언트가 30초마다 heartbeat_seat()을
--    호출해 last_heartbeat_at을 갱신하고, pg_cron이 1분마다
--    sweep_stale_seats()를 돌려서 heartbeat이 3분 넘게 끊긴(=사실상 연결이
--    끊긴) 좌석을 자동으로 정산 후 비웁니다. 기존 presence 기반 즉시 정리는
--    "누군가 접속해 있을 때"의 빠른 경로로 그대로 두고, 이 sweep은 아무도
--    없을 때를 위한 백스톱입니다.
-- ============================================================

alter table public.seats
  add column if not exists last_heartbeat_at timestamptz;

-- ------------------------------------------------------------
-- (1회성) 이 버그로 지금까지 미정리된 채 남아있는 좌석을 정리합니다.
-- last_heartbeat_at을 방금 컬럼으로 추가해서 이 좌석들은 하트비트 기록이
-- 전혀 없어(=진짜 착석 시간을 판단할 근거가 status_changed_at뿐) 최대
-- 15시간으로 상한을 두고 정산합니다 — 그 이상은 이 버그가 만든 가짜
-- 시간일 뿐이고, 15시간 이하 구간은 정상적으로 인정해서 지금 한창
-- 공부(겸 휴식) 중이던 사람의 기록이 손실되지 않게 합니다. 정리 후에는
-- 다시 자리를 눌러 앉으면 새 세션으로 정상 집계되고, 이 이후로는 아래
-- heartbeat_seat/sweep_stale_seats가 있어서 이런 상한 없이도 실제 착석
-- 시간을 정확히 정산할 수 있습니다.
-- ------------------------------------------------------------
do $$
declare
  occupied record;
  elapsed integer;
  capped_elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
  max_credit_seconds constant integer := 15 * 3600;
begin
  for occupied in
    select user_id, status_changed_at
    from public.seats
    where user_id is not null and status_changed_at is not null
  loop
    elapsed := greatest(
      0,
      extract(epoch from (now() - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, now())
    );
    capped_elapsed := least(elapsed, max_credit_seconds);

    if capped_elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (occupied.user_id, today, capped_elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + capped_elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;
  end loop;

  update public.seats
  set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
  where user_id is not null;
end $$;

-- 좌석에 앉아있는 동안 클라이언트가 주기적으로 호출해 "아직 살아있음"을
-- 알리는 하트비트. 앉아있지 않은 유저가 호출해도 매칭되는 행이 없어
-- 그냥 조용히 아무 일도 안 합니다.
create or replace function public.heartbeat_seat()
returns void
language plpgsql
security invoker
as $$
begin
  update public.seats
  set last_heartbeat_at = now()
  where user_id = auth.uid();
end;
$$;

grant execute on function public.heartbeat_seat() to authenticated;

-- sit_at_seat: 착석 시 last_heartbeat_at도 같이 초기화
create or replace function public.sit_at_seat(target_seat_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if public.is_within_excluded_hours() then
    raise exception '평일 09:00~17:50에는 착석할 수 없습니다';
  end if;

  -- 자리를 옮기는 경우, 기존 자리에 앉아있던 시간부터 정산
  perform public.settle_current_seat();

  -- 기존에 앉아있던 자리가 있으면 비우기
  update public.seats
  set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
  where user_id = auth.uid();

  -- 새 자리에 착석 (이미 다른 사람이 앉아있으면 실패)
  update public.seats
  set user_id = auth.uid(), status_changed_at = now(), last_heartbeat_at = now()
  where id = target_seat_id and user_id is null;

  if not found then
    raise exception '이미 다른 사람이 앉아있는 자리입니다';
  end if;
end;
$$;

-- leave_seat: 퇴장 시 last_heartbeat_at도 같이 정리
create or replace function public.leave_seat()
returns void
language plpgsql
security invoker
as $$
begin
  perform public.settle_current_seat();

  update public.seats
  set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
  where user_id = auth.uid();
end;
$$;

-- clear_seat_for_user: presence leave 경로. now()가 아니라 "마지막으로
-- 하트비트가 확인된 시각"(last_heartbeat_at, 없으면 status_changed_at)까지만
-- 정산합니다 — 목격자 클라이언트가 leave 이벤트를 좀 늦게 처리하거나,
-- 실제로는 이미 몇 분/몇 시간 전에 하트비트가 끊긴 뒤였어도, 그 시점 이후의
-- 시간은 크레딧되지 않습니다. 진짜로 하트비트가 계속 이어진 세션은(쉬면서
-- 계속 앉아있던 경우 포함) 길이에 상관없이 정확히 그대로 인정되므로 별도
-- 시간 상한이 필요 없습니다. "for update"로 행을 잠가서, 같은 좌석을
-- sweep_stale_seats가 정확히 같은 순간에 처리하며 시간이 이중으로
-- 크레딧되는 것도 막습니다.
create or replace function public.clear_seat_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  effective_until timestamptz;
  elapsed integer;
  settle_date date;
begin
  select status_changed_at, coalesce(last_heartbeat_at, status_changed_at)
  into since, effective_until
  from public.seats
  where user_id = target_user_id and status_changed_at is not null
  for update;

  if since is not null then
    elapsed := greatest(
      0,
      extract(epoch from (effective_until - since))::integer
        - public.excluded_seconds(since, effective_until)
    );

    if elapsed > 0 then
      settle_date := (effective_until at time zone 'Asia/Seoul')::date;

      insert into public.attendance_logs (user_id, date, total_seconds)
      values (target_user_id, settle_date, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = target_user_id;

      perform public.recompute_streak(target_user_id);
      perform public.check_unlocks(target_user_id);
    end if;
  end if;

  update public.seats
  set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
  where user_id = target_user_id;
end;
$$;

-- clear_seats_for_excluded_hours: 업무시간 일괄 퇴장. last_heartbeat_at 정리와
-- 함께, now()가 아니라 마지막으로 하트비트가 확인된 시각까지만 정산해서
-- (이 함수는 9시 정각 부근에만 도니 사실상 거의 항상 now()와 같지만) 일관성을
-- 맞춥니다. 계속 하트비트가 이어진 세션은 길이에 상관없이 그대로 인정되므로
-- 별도 시간 상한이 필요 없습니다.
create or replace function public.clear_seats_for_excluded_hours()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied record;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.is_within_excluded_hours() then
    return;
  end if;

  for occupied in
    select
      s.user_id,
      s.status_changed_at,
      coalesce(s.last_heartbeat_at, s.status_changed_at) as effective_until
    from public.seats s
    where s.user_id is not null and s.status_changed_at is not null
    for update
  loop
    elapsed := greatest(
      0,
      extract(epoch from (occupied.effective_until - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, occupied.effective_until)
    );

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (occupied.user_id, today, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;
  end loop;

  update public.seats
  set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
  where user_id is not null;
end;
$$;

-- sweep_stale_seats: heartbeat이 3분 넘게 끊긴 좌석을 정산 후 비웁니다.
-- "지금"이 아니라 "마지막으로 살아있다고 확인된 시각"(last_heartbeat_at,
-- 없으면 status_changed_at)까지만 정산해서 sweep 실행이 늦어져도 실제로
-- 없던 시간이 얹혀 크레딧되지 않습니다. 계속 하트비트가 이어지다 방금
-- 끊긴 세션은(오래 쉬면서 앉아있던 경우 포함) 길이에 상관없이 그대로
-- 인정되므로 별도 시간 상한이 필요 없습니다.
create or replace function public.sweep_stale_seats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied record;
  elapsed integer;
  stale_threshold constant interval := interval '3 minutes';
begin
  for occupied in
    select
      s.user_id,
      s.status_changed_at,
      coalesce(s.last_heartbeat_at, s.status_changed_at) as effective_until
    from public.seats s
    where s.user_id is not null
      and s.status_changed_at is not null
      and coalesce(s.last_heartbeat_at, s.status_changed_at) < now() - stale_threshold
    for update
  loop
    elapsed := greatest(
      0,
      extract(epoch from (occupied.effective_until - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, occupied.effective_until)
    );

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (
        occupied.user_id,
        (occupied.effective_until at time zone 'Asia/Seoul')::date,
        elapsed
      )
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;

    update public.seats
    set user_id = null, status = null, status_changed_at = null, last_heartbeat_at = null
    where user_id = occupied.user_id;
  end loop;
end;
$$;

-- pg_cron으로 sweep_stale_seats를 1분마다 실행합니다.
-- "create extension" 줄에서 권한 오류가 나면, Supabase 대시보드 →
-- Database → Extensions에서 pg_cron을 먼저 켠 뒤 이 파일의 나머지 부분을
-- 다시 실행하세요. 이미 같은 이름의 스케줄이 있으면 재실행 시 안전하게
-- 갱신되도록 unschedule 후 다시 등록합니다.
create extension if not exists pg_cron;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'sweep-stale-seats') then
    perform cron.unschedule('sweep-stale-seats');
  end if;
end $$;

select cron.schedule(
  'sweep-stale-seats',
  '* * * * *',
  $$select public.sweep_stale_seats();$$
);

-- ============================================================
-- 18. 한 사람이 동시에 여러 좌석을 차지하는 것 방지 + 유령 좌석이 만든
--     가짜 공부시간 보정
--    sit_at_seat이 "기존 좌석 비우기 → 새 좌석 차지하기" 두 단계로
--    동작하는데, seats.user_id에 유니크 제약이 없어서 같은 사람이 여러
--    기기/탭에서 거의 동시에 착석을 시도하면 두 단계 사이 레이스로 한
--    사람이 동시에 여러 좌석을 차지할 수 있었습니다. 이런 "유령 좌석"들이
--    원래 버그(탭 닫아도 안 비워짐) 때문에 며칠씩 미정리로 남아있다가,
--    17번 섹션의 1회성 정리에서 유저 하나당 여러 개가 각각 정산되면서
--    합산되어 41~62시간 같은 비정상적인 값이 오늘 치 공부시간에 들어갔습니다.
-- ============================================================

-- 좌석은 한 사람당 하나만 차지할 수 있도록 DB 레벨에서 강제
create unique index if not exists idx_seats_one_per_user
  on public.seats (user_id)
  where user_id is not null;

-- ------------------------------------------------------------
-- (1회성) 위 유령 좌석 버그로 오늘 치 공부시간이 비정상적으로 커진
-- 계정들을 원상복구. 오늘 정산분을 0으로 되돌리고, 전체 누적
-- 랭킹시간(total_study_seconds)에서도 같은 만큼 빼서 이중 오염을
-- 막습니다. affected_names 배열은 실제로 확인된 계정 이름으로
-- 바꿔서 실행하세요.
-- ------------------------------------------------------------
do $$
declare
  affected_names constant text[] := array[
    '4기_판교_2반_양경환',
    '4기_판교_2반_천성훈',
    '4기_판교_2반_윤신혜'
  ];
  today date := (now() at time zone 'Asia/Seoul')::date;
  row_ record;
begin
  for row_ in
    select al.user_id, al.total_seconds as bogus_seconds
    from public.attendance_logs al
    join public.users u on u.id = al.user_id
    where al.date = today
      and u.name = any(affected_names)
  loop
    update public.users
    set total_study_seconds = greatest(0, total_study_seconds - row_.bogus_seconds)
    where id = row_.user_id;

    update public.attendance_logs
    set total_seconds = 0
    where user_id = row_.user_id and date = today;

    perform public.recompute_streak(row_.user_id);
  end loop;
end $$;

-- ============================================================
-- 19. 평일 09:00~17:50 착석 제한, 오늘(KST) 하루만 임시로 풀기
--    (자기만료형 테스트 예외)
--    방금 배포한 좌석 하트비트/공부시간 수정을 테스트하는데 업무시간
--    착석 차단이 걸리적거려서, 딱 오늘 날짜에만 차단을 건너뛰도록
--    바꿉니다. 날짜가 지나면 이 조건이 다시는 참이 되지 않아 자동으로
--    원래 동작(평일 9~17:50 차단 + 그 시간 제외)으로 돌아가므로, 나중에
--    되돌리는 걸 깜빡할 걱정이 없습니다. 필요 없어지면 이 섹션과 아래
--    두 함수를 원래(TEST_BYPASS 없는) 버전으로 되돌려도 됩니다.
-- ============================================================

create or replace function public.is_within_excluded_hours()
returns boolean
language plpgsql
as $$
declare
  seoul_now timestamp := now() at time zone 'Asia/Seoul';
  test_bypass_date constant date := '2026-08-10';
begin
  if seoul_now::date = test_bypass_date then
    return false;
  end if;

  return extract(isodow from seoul_now) between 1 and 5
    and seoul_now::time >= time '09:00:00'
    and seoul_now::time < time '17:50:00';
end;
$$;

create or replace function public.excluded_seconds(range_start timestamptz, range_end timestamptz)
returns integer
language plpgsql
as $$
declare
  total_excluded integer := 0;
  day_cursor date;
  last_day date;
  excl_start timestamptz;
  excl_end timestamptz;
  overlap_start timestamptz;
  overlap_end timestamptz;
  test_bypass_date constant date := '2026-08-10';
begin
  if range_end <= range_start then
    return 0;
  end if;

  day_cursor := (range_start at time zone 'Asia/Seoul')::date;
  last_day := (range_end at time zone 'Asia/Seoul')::date;

  while day_cursor <= last_day loop
    -- isodow: 1=월요일 ... 5=금요일, 6/7=주말
    if extract(isodow from day_cursor) between 1 and 5 and day_cursor <> test_bypass_date then
      excl_start := (day_cursor + time '09:00:00') at time zone 'Asia/Seoul';
      excl_end := (day_cursor + time '17:50:00') at time zone 'Asia/Seoul';

      overlap_start := greatest(range_start, excl_start);
      overlap_end := least(range_end, excl_end);

      if overlap_end > overlap_start then
        total_excluded := total_excluded + extract(epoch from (overlap_end - overlap_start))::integer;
      end if;
    end if;

    day_cursor := day_cursor + 1;
  end loop;

  return total_excluded;
end;
$$;

-- ============================================================
-- 20. 하트비트를 seats에서 분리해 Realtime 브로드캐스트 폭주 제거
--
--    [문제]
--    heartbeat_seat()이 30초마다 seats.last_heartbeat_at을 UPDATE하는데,
--    seats는 supabase_realtime publication에 들어있습니다(297번 줄).
--    Realtime의 구독 단위는 "테이블"이지 "컬럼"이 아니라서, 클라이언트는
--    "seats가 바뀌면 알려줘"까지만 말할 수 있고 "last_heartbeat_at만 바뀐
--    건 빼고"는 표현할 수가 없습니다. 그래서 좌석에 아무 의미 있는 변화가
--    없어도 하트비트 한 번마다 접속자 전원에게 알림이 가고, 전원이
--    fetchTables()를 돌립니다.
--
--    N명이 앉아있으면 30초마다 N x N 번의 전체 좌석 조회가 발생합니다.
--    (45명 기준 30초당 2,025회 = 초당 68회, Postgres 쿼리로는 초당 ~200개)
--    Realtime 메시지 쿼터도 이 속도로 태웁니다.
--
--    [해결]
--    화면에 그릴 일이 전혀 없는 last_heartbeat_at을 publication에 없는
--    별도 테이블로 옮깁니다. publication에 없는 테이블은 Realtime이 WAL
--    디코딩 자체를 하지 않으므로, 30초마다 두들겨도 브로드캐스트 비용이
--    0입니다. 좌석 착석/퇴장 같은 "진짜 변화"만 seats에 남아 알림이 갑니다.
--
--    [앱 배포가 필요 없는 이유]
--    클라이언트는 supabase.rpc("heartbeat_seat")라는 이름만 압니다.
--    이름과 시그니처를 그대로 두고 몸통만 바꾸므로, 지금 열려 있는 탭들도
--    아무것도 모른 채 계속 정상 동작합니다. 새로고침도 필요 없습니다.
--
--    [데이터 안전장치]
--    - attendance_logs / users.total_study_seconds는 이 마이그레이션에서
--      단 한 줄도 건드리지 않습니다. 이미 쌓인 공부시간은 그대로입니다.
--    - 전체를 단일 트랜잭션으로 묶습니다. 중간 상태가 노출되지 않습니다.
--    - 함수를 바꾸기 "전에" 현재 착석자의 하트비트를 새 테이블로 백필합니다.
--      이걸 빠뜨리면 새 sweep이 빈 테이블을 보고 3분 넘게 앉아있던 사람을
--      전원 퇴장시켜 버립니다. 이 마이그레이션에서 가장 위험한 지점입니다.
--    - seats.last_heartbeat_at 컬럼은 "지우지 않고" 남겨둡니다. 되돌릴 때
--      필요합니다. (아래 롤백 스크립트 참고)
--    - 정산 로직(elapsed 계산식, excluded_seconds 차감, settle_date 기준)은
--      기존과 완전히 동일하게 유지합니다. 읽는 위치만 바뀝니다.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 20-1. 하트비트 전용 테이블
--    publication에 "추가하지 않는 것"이 이 작업의 전부입니다.
--    RLS를 켜고 정책을 하나도 만들지 않아 클라이언트의 직접 접근은 막고,
--    아래 security definer 함수들로만 접근하게 합니다.
-- ------------------------------------------------------------
create table if not exists public.seat_heartbeats (
  user_id uuid primary key references public.users(id) on delete cascade,
  last_heartbeat_at timestamptz not null default now()
);

alter table public.seat_heartbeats enable row level security;

-- ------------------------------------------------------------
-- 20-2. (중요) 현재 착석자 백필
--    지금 앉아있는 사람들의 마지막 하트비트를 그대로 옮겨옵니다.
--    now()로 덮어쓰면 안 됩니다 — 이미 하트비트가 끊긴 사람에게 없던
--    시간을 크레딧하게 됩니다. 실제 값을 보존해야 정산이 정확합니다.
-- ------------------------------------------------------------
insert into public.seat_heartbeats (user_id, last_heartbeat_at)
select
  s.user_id,
  coalesce(s.last_heartbeat_at, s.status_changed_at, now())
from public.seats s
where s.user_id is not null
on conflict (user_id)
do update set last_heartbeat_at = excluded.last_heartbeat_at;

-- ------------------------------------------------------------
-- 20-3. 정산 기준 시각을 한 곳에서 계산하는 헬퍼
--    4개 정산 경로(leave / presence leave / 업무시간 일괄 / sweep)가
--    똑같은 규칙을 쓰도록 함수로 뽑습니다.
--
--    greatest(status_changed_at, ...)로 감싸는 게 핵심입니다. 옛 세션의
--    하트비트 행이 남아있는 채로 그 사람이 다시 앉으면, 낡은 타임스탬프
--    때문에 "방금 앉은 자리가 즉시 sweep당하는" 사고가 납니다. 착석 시각과
--    비교해 큰 쪽을 쓰면 행 정리를 깜빡해도 안전합니다.
--    least(now(), ...)는 어떤 이유로든 미래 시각이 들어와도 없던 시간이
--    크레딧되지 않게 막는 상한입니다.
-- ------------------------------------------------------------
create or replace function public.seat_effective_until(
  p_user_id uuid,
  p_status_changed_at timestamptz
)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select least(
    now(),
    greatest(
      p_status_changed_at,
      coalesce(
        (select hb.last_heartbeat_at
         from public.seat_heartbeats hb
         where hb.user_id = p_user_id),
        p_status_changed_at
      )
    )
  );
$$;

-- ------------------------------------------------------------
-- 20-3b. sit_at_seat / leave_seat이 쓸 하트비트 쓰기 헬퍼
--    이 둘은 security invoker라 RLS가 걸린 seat_heartbeats에 직접 쓸 수
--    없어서 definer 함수로 감쌉니다.
--
--    (보안) 일부러 user_id를 인자로 받지 않고 auth.uid()만 씁니다. 인자를
--    받으면 authenticated 아무나 남의 하트비트를 지울 수 있고, 그러면
--    3분 뒤 sweep이 그 사람 좌석을 비워버려 좌석을 빼앗을 수 있습니다.
--    인자가 없으면 호출자는 자기 자신에게만 영향을 줄 수 있습니다.
-- ------------------------------------------------------------
create or replace function public.touch_seat_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.seat_heartbeats (user_id, last_heartbeat_at)
  values (auth.uid(), now())
  on conflict (user_id)
  do update set last_heartbeat_at = now();
end;
$$;

create or replace function public.drop_seat_heartbeat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.seat_heartbeats where user_id = auth.uid();
end;
$$;

grant execute on function public.touch_seat_heartbeat() to authenticated;
grant execute on function public.drop_seat_heartbeat() to authenticated;

-- ------------------------------------------------------------
-- 20-4. heartbeat_seat: seats를 아예 건드리지 않습니다
--    이 함수가 seats에 쓰지 않게 되는 것이 이 마이그레이션의 목적입니다.
--    security definer로 바꿔서 seat_heartbeats에 RLS 정책을 열지 않고도
--    본인 행만 갱신하게 합니다.
-- ------------------------------------------------------------
create or replace function public.heartbeat_seat()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  -- 앉아있지 않으면 아무 일도 하지 않습니다 (기존 동작과 동일)
  if not exists (select 1 from public.seats where user_id = auth.uid()) then
    return;
  end if;

  insert into public.seat_heartbeats (user_id, last_heartbeat_at)
  values (auth.uid(), now())
  on conflict (user_id)
  do update set last_heartbeat_at = now();
end;
$$;

grant execute on function public.heartbeat_seat() to authenticated;

-- ------------------------------------------------------------
-- 20-5. sit_at_seat: 착석 시 하트비트를 새 테이블에서 초기화
--    seats.last_heartbeat_at 쓰기를 제거한 것 외에는 기존과 동일합니다.
-- ------------------------------------------------------------
create or replace function public.sit_at_seat(target_seat_id uuid)
returns void
language plpgsql
security invoker
as $$
begin
  if public.is_within_excluded_hours() then
    raise exception '평일 09:00~17:50에는 착석할 수 없습니다';
  end if;

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

  perform public.touch_seat_heartbeat();
end;
$$;

-- ------------------------------------------------------------
-- 20-6. leave_seat: 퇴장 시 하트비트 행 제거
-- ------------------------------------------------------------
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

  perform public.drop_seat_heartbeat();
end;
$$;

-- ------------------------------------------------------------
-- 20-7. clear_seat_for_user: presence leave 경로
--    effective_until을 seat_heartbeats에서 읽는 것 외에는 기존과 동일.
--    "for update"로 행을 잠가 sweep_stale_seats와 동시에 처리되며 시간이
--    이중 크레딧되는 것을 막는 것도 그대로 유지합니다.
-- ------------------------------------------------------------
create or replace function public.clear_seat_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  effective_until timestamptz;
  elapsed integer;
  settle_date date;
begin
  select status_changed_at
  into since
  from public.seats
  where user_id = target_user_id and status_changed_at is not null
  for update;

  if since is not null then
    effective_until := public.seat_effective_until(target_user_id, since);

    elapsed := greatest(
      0,
      extract(epoch from (effective_until - since))::integer
        - public.excluded_seconds(since, effective_until)
    );

    if elapsed > 0 then
      settle_date := (effective_until at time zone 'Asia/Seoul')::date;

      insert into public.attendance_logs (user_id, date, total_seconds)
      values (target_user_id, settle_date, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = target_user_id;

      perform public.recompute_streak(target_user_id);
      perform public.check_unlocks(target_user_id);
    end if;
  end if;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id = target_user_id;

  delete from public.seat_heartbeats where user_id = target_user_id;
end;
$$;

-- ------------------------------------------------------------
-- 20-8. clear_seats_for_excluded_hours: 업무시간 일괄 퇴장
-- ------------------------------------------------------------
create or replace function public.clear_seats_for_excluded_hours()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied record;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if not public.is_within_excluded_hours() then
    return;
  end if;

  for occupied in
    select
      s.user_id,
      s.status_changed_at,
      public.seat_effective_until(s.user_id, s.status_changed_at) as effective_until
    from public.seats s
    where s.user_id is not null and s.status_changed_at is not null
    for update
  loop
    elapsed := greatest(
      0,
      extract(epoch from (occupied.effective_until - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, occupied.effective_until)
    );

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (occupied.user_id, today, elapsed)
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;

    delete from public.seat_heartbeats where user_id = occupied.user_id;
  end loop;

  update public.seats
  set user_id = null, status = null, status_changed_at = null
  where user_id is not null;
end;
$$;

-- ------------------------------------------------------------
-- 20-9. sweep_stale_seats: 하트비트를 새 테이블에서 읽습니다
--    3분 임계값, 정산 기준 시각, elapsed 계산 모두 기존과 동일합니다.
-- ------------------------------------------------------------
create or replace function public.sweep_stale_seats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  occupied record;
  elapsed integer;
  stale_threshold constant interval := interval '3 minutes';
begin
  for occupied in
    select
      s.user_id,
      s.status_changed_at,
      public.seat_effective_until(s.user_id, s.status_changed_at) as effective_until
    from public.seats s
    where s.user_id is not null
      and s.status_changed_at is not null
      and public.seat_effective_until(s.user_id, s.status_changed_at)
          < now() - stale_threshold
    for update
  loop
    elapsed := greatest(
      0,
      extract(epoch from (occupied.effective_until - occupied.status_changed_at))::integer
        - public.excluded_seconds(occupied.status_changed_at, occupied.effective_until)
    );

    if elapsed > 0 then
      insert into public.attendance_logs (user_id, date, total_seconds)
      values (
        occupied.user_id,
        (occupied.effective_until at time zone 'Asia/Seoul')::date,
        elapsed
      )
      on conflict (user_id, date)
      do update set total_seconds = public.attendance_logs.total_seconds + excluded.total_seconds;

      update public.users
      set total_study_seconds = total_study_seconds + elapsed
      where id = occupied.user_id;

      perform public.recompute_streak(occupied.user_id);
      perform public.check_unlocks(occupied.user_id);
    end if;

    update public.seats
    set user_id = null, status = null, status_changed_at = null
    where user_id = occupied.user_id;

    delete from public.seat_heartbeats where user_id = occupied.user_id;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 20-9b. recompute_streak: 값이 실제로 바뀔 때만 UPDATE
--
--    users도 supabase_realtime publication에 있습니다(333번 줄). 그리고
--    seat-room이 users UPDATE를 구독해서, 한 건이라도 UPDATE가 나면 접속자
--    전원이 fetchTables() + fetchRankings()를 돕니다(요청 5개).
--
--    그런데 이 함수는 streak_days가 그대로여도 매번 UPDATE를 날립니다.
--    정산 한 번마다 users가 최대 3번 UPDATE되는데(total_study_seconds,
--    streak_days, unlocked_items) 그중 하나가 대부분 무의미한 쓰기입니다.
--    실제 스트릭이 바뀌는 건 하루에 한 번뿐인데 정산할 때마다 쓰고 있었습니다.
--
--    "is distinct from"으로 막으면 값이 그대로일 때 행을 건드리지 않고,
--    WAL에도 안 남아 브로드캐스트가 발생하지 않습니다.
--    (check_unlocks는 이미 newly_unlocked is not null 가드가 있습니다)
-- ------------------------------------------------------------
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

  update public.users
  set streak_days = streak
  where id = target_user_id
    and streak_days is distinct from streak;
end;
$$;

commit;

-- ------------------------------------------------------------
-- 20-10. 실행 후 검증 쿼리 (따로 실행하세요)
-- ------------------------------------------------------------

-- (1) 새 테이블이 publication에 안 들어갔는지 확인 — 0행이 나와야 정상.
--     1행이 나오면 이 마이그레이션이 아무 효과가 없습니다. 그 경우
--     alter publication supabase_realtime drop table public.seat_heartbeats;
-- select schemaname, tablename
-- from pg_publication_tables
-- where pubname = 'supabase_realtime' and tablename = 'seat_heartbeats';

-- (2) 백필이 제대로 됐는지 — 두 숫자가 같아야 정상.
--     다르면 즉시 아래 롤백을 실행하세요.
-- select
--   (select count(*) from public.seats where user_id is not null) as 착석자수,
--   (select count(*) from public.seat_heartbeats hb
--      join public.seats s on s.user_id = hb.user_id) as 백필된수;

-- (3) 하트비트가 새 테이블로 들어오고 있는지 — 1분쯤 뒤 실행.
--     stale_seconds가 30 안팎에서 계속 갱신되면 정상 동작 중입니다.
-- select u.name,
--        extract(epoch from (now() - hb.last_heartbeat_at))::int as stale_seconds
-- from public.seat_heartbeats hb
-- join public.users u on u.id = hb.user_id
-- order by stale_seconds desc;

-- (4) seats에 하트비트 UPDATE가 더 이상 안 일어나는지 확인.
--     좌석에 아무 변화가 없으면 이 값이 계속 그대로여야 합니다.
-- select max(status_changed_at) from public.seats;

-- ------------------------------------------------------------
-- 20-11. 롤백 스크립트 (문제 생겼을 때만 실행)
--    seats.last_heartbeat_at 컬럼을 안 지우고 남겨뒀기 때문에, 새 테이블의
--    값을 되돌려 넣은 뒤 17번 섹션의 함수 정의들을 다시 실행하면 원상복구됩니다.
--    반드시 "값 복사 -> 함수 복원" 순서로 해야 sweep이 오작동하지 않습니다.
-- ------------------------------------------------------------
-- begin;
--   update public.seats s
--   set last_heartbeat_at = hb.last_heartbeat_at
--   from public.seat_heartbeats hb
--   where hb.user_id = s.user_id;
--
--   -- 이어서 이 파일 17번 섹션의 heartbeat_seat / sweep_stale_seats /
--   -- sit_at_seat / leave_seat / clear_seat_for_user /
--   -- clear_seats_for_excluded_hours 정의를 그대로 다시 실행하세요.
-- commit;

-- ============================================================
-- 21. users 테이블을 컬럼 단위로 잠가서 랭킹 조작 차단
--
--    [문제]
--    users_update_own 정책(135번 줄)은 "본인 행이면 수정 가능"만 말하고,
--    RLS는 행 단위라 어떤 컬럼을 고칠 수 있는지는 못 가립니다. 그래서
--    로그인한 사람이 브라우저 콘솔에서 이렇게 하면 그대로 통과합니다:
--
--      supabase.from('users')
--        .update({ total_study_seconds: 999999999 })
--        .eq('id', '<본인 id>')
--
--    랭킹(total_study_seconds), 연속 출석(streak_days), 아이템 해금
--    (unlocked_items)이 전부 클라이언트에서 위조 가능한 상태였습니다.
--
--    [해결]
--    RLS와 별개로 존재하는 Postgres의 "컬럼 단위 GRANT"를 씁니다.
--    앱이 authenticated 권한으로 실제 쓰는 컬럼은 5개뿐이라
--    (name / mood / show_mood / worn_items / avatar_color)
--    그것만 허용하고 나머지는 회수하면 앱 코드는 한 줄도 안 바꿔도 됩니다.
--
--    users_update_own 정책은 그대로 둡니다. 두 겹으로 걸려서
--    "본인 행의, 허용된 컬럼만" 수정 가능해집니다.
--
--    [⚠️ 먼저 처리해야 하는 것 — 이거 빼먹으면 공부시간 정산이 깨짐]
--    settle_current_seat()이 security INVOKER라서 호출한 사용자 권한으로
--    돕니다. 이 함수가 total_study_seconds를 직접 UPDATE하기 때문에,
--    권한만 회수하면 자리에서 일어날 때(leave_seat -> settle_current_seat)
--    정산이 권한 오류로 실패합니다. 그래서 이 함수를 security definer로
--    바꿔서 소유자 권한으로 돌게 먼저 만듭니다.
--
--    함수 본문이 auth.uid()로만 대상을 잡기 때문에 definer로 바꿔도
--    남의 기록을 건드릴 수 있는 경로는 생기지 않습니다.
--
--    나머지 정산 경로(clear_seat_for_user / clear_seats_for_excluded_hours /
--    sweep_stale_seats / recompute_streak / check_unlocks / grant_item)는
--    이미 전부 security definer라 영향을 받지 않습니다.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 21-1. settle_current_seat을 security definer로 전환
--    로직은 기존과 완전히 동일하고 security 모드와 search_path만 바뀝니다.
-- ------------------------------------------------------------
create or replace function public.settle_current_seat()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  since timestamptz;
  elapsed integer;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  select status_changed_at into since
  from public.seats
  where user_id = auth.uid() and status_changed_at is not null;

  if since is null then
    return;
  end if;

  elapsed := greatest(0, extract(epoch from (now() - since))::integer - public.excluded_seconds(since, now()));

  if elapsed = 0 then
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
  perform public.check_unlocks(auth.uid());
end;
$$;

-- ------------------------------------------------------------
-- 21-2. 컬럼 단위로 UPDATE 권한 재설정
--    revoke가 먼저 와야 기존의 "테이블 전체 UPDATE" 권한이 사라집니다.
--    service_role은 건드리지 않으므로 관리 작업은 그대로 됩니다.
-- ------------------------------------------------------------
revoke update on public.users from authenticated;
revoke update on public.users from anon;

grant update (name, mood, show_mood, worn_items, avatar_color)
  on public.users to authenticated;

commit;

-- ------------------------------------------------------------
-- 21-3. 검증 (따로 실행)
-- ------------------------------------------------------------

-- (1) 허용된 컬럼이 정확히 5개인지 확인.
--     name / mood / show_mood / worn_items / avatar_color 만 나와야 정상.
-- select column_name
-- from information_schema.column_privileges
-- where table_schema = 'public' and table_name = 'users'
--   and grantee = 'authenticated' and privilege_type = 'UPDATE'
-- order by column_name;

-- (2) settle_current_seat이 definer로 바뀌었는지 확인. true여야 정상.
-- select proname, prosecdef
-- from pg_proc
-- where pronamespace = 'public'::regnamespace
--   and proname in ('settle_current_seat', 'recompute_streak', 'check_unlocks');

-- (3) 실제 차단 확인 — 브라우저 콘솔에서 아래를 실행하면
--     "permission denied for table users" 류의 에러가 나야 정상입니다.
--     await supabase.from('users')
--       .update({ total_study_seconds: 999999999 })
--       .eq('id', (await supabase.auth.getUser()).data.user.id)

-- (4) 정상 동작 확인 — 자리에 앉았다 일어난 뒤 공부시간이 늘어나는지,
--     옷장에서 아이템 배치/색 변경이 저장되는지, 마이페이지에서 이름과
--     기분 변경이 되는지 직접 확인하세요. 21-1을 빼먹으면 (4)의 첫 번째가
--     조용히 실패합니다.

-- ------------------------------------------------------------
-- 21-4. 롤백 (문제 생겼을 때만)
-- ------------------------------------------------------------
-- begin;
--   grant update on public.users to authenticated;
--   -- settle_current_seat은 definer로 둬도 무해하므로 굳이 되돌릴 필요 없음.
--   -- 굳이 되돌리려면 710번 줄 부근의 security invoker 버전을 다시 실행하세요.
-- commit;
