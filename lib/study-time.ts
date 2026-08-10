const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;
const EXCLUDE_START_MS = 9 * 60 * 60 * 1000; // 09:00
const EXCLUDE_END_MS = (17 * 60 + 50) * 60 * 1000; // 17:50
const DAY_MS = 24 * 60 * 60 * 1000;

function seoulMidnightUtcMs(utcMs: number): number {
  const seoulMs = utcMs + SEOUL_OFFSET_MS;
  const flooredSeoulDayMs = Math.floor(seoulMs / DAY_MS) * DAY_MS;
  return flooredSeoulDayMs - SEOUL_OFFSET_MS;
}

function seoulWeekday(utcMs: number): number {
  return new Date(utcMs + SEOUL_OFFSET_MS).getUTCDay();
}

// 오늘(KST) 하루만 착석 제한을 임시로 풀기 위한 자기만료형 테스트 예외.
// 날짜가 지나면 이 조건이 다시는 참이 되지 않아 자동으로 원래 동작(평일
// 9~17:50 차단)으로 돌아가므로, 나중에 되돌리는 걸 깜빡할 걱정이 없다.
// 테스트가 끝나면 이 블록과 isWithinExcludedHours의 사용 부분만 지워도 됨.
const TEST_BYPASS_DATE_KST = "2026-08-10";

function isSeoulDate(utcMs: number, dateStr: string): boolean {
  return new Date(utcMs + SEOUL_OFFSET_MS).toISOString().slice(0, 10) === dateStr;
}

// 평일(월~금) 09:00~17:50 KST와 겹치는 구간(ms)을 계산.
// [startMs, endMs) 구간이 여러 날에 걸쳐도 하루 단위로 겹치는 만큼 누적.
export function excludedMsBetween(startMs: number, endMs: number): number {
  if (endMs <= startMs) return 0;

  let excluded = 0;
  let dayStart = seoulMidnightUtcMs(startMs);
  const lastDayStart = seoulMidnightUtcMs(endMs);

  while (dayStart <= lastDayStart) {
    const weekday = seoulWeekday(dayStart);
    if (weekday >= 1 && weekday <= 5 && !isSeoulDate(dayStart, TEST_BYPASS_DATE_KST)) {
      const exclStart = dayStart + EXCLUDE_START_MS;
      const exclEnd = dayStart + EXCLUDE_END_MS;
      const overlapStart = Math.max(startMs, exclStart);
      const overlapEnd = Math.min(endMs, exclEnd);
      if (overlapEnd > overlapStart) {
        excluded += overlapEnd - overlapStart;
      }
    }
    dayStart += DAY_MS;
  }

  return excluded;
}

// 평일(월~금) 09:00~17:50 KST 시간대인지 여부 (착석 차단 시간대).
export function isWithinExcludedHours(date: Date = new Date()): boolean {
  const utcMs = date.getTime();
  if (isSeoulDate(utcMs, TEST_BYPASS_DATE_KST)) return false;

  const weekday = seoulWeekday(utcMs);
  if (weekday < 1 || weekday > 5) return false;

  const msSinceMidnight = utcMs - seoulMidnightUtcMs(utcMs);
  return msSinceMidnight >= EXCLUDE_START_MS && msSinceMidnight < EXCLUDE_END_MS;
}