const BAR_MAX_HEIGHT = 96;
const LABEL_SPACE = 20;

function formatHoursMinutes(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}분`;
  return `${hours}시간 ${minutes}분`;
}

export type DailyStudy = {
  date: string;
  weekday: string;
  seconds: number;
  isToday: boolean;
};

export default function StatsPanel({
  totalStudySeconds,
  streakDays,
  dailyHistory,
}: {
  totalStudySeconds: number;
  streakDays: number;
  dailyHistory: DailyStudy[];
}) {
  const maxSeconds = Math.max(...dailyHistory.map((d) => d.seconds), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            총 누적 공부 시간
          </p>
          <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
            {formatHoursMinutes(totalStudySeconds)}
          </p>
        </div>
        <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            연속 출석일
          </p>
          <p className="mt-1 text-2xl font-semibold text-black dark:text-zinc-50">
            {streakDays}일
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          최근 7일 공부 시간
        </p>
        <div className="mt-4 flex items-end gap-3">
          {dailyHistory.map((day) => {
            const barHeight = Math.max(
              4,
              Math.round((day.seconds / maxSeconds) * BAR_MAX_HEIGHT)
            );
            return (
              <div
                key={day.date}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div
                  className="relative flex w-full items-end justify-center"
                  style={{ height: BAR_MAX_HEIGHT + LABEL_SPACE }}
                >
                  {day.seconds > 0 && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400"
                      style={{ bottom: barHeight + 4 }}
                    >
                      {formatHoursMinutes(day.seconds)}
                    </span>
                  )}
                  <div
                    title={`${day.date}: ${formatHoursMinutes(day.seconds)}`}
                    style={{ height: barHeight }}
                    className={`w-6 max-w-6 rounded-t-[4px] transition-all ${
                      day.isToday
                        ? "bg-emerald-500 ring-2 ring-emerald-600 ring-offset-1 dark:ring-offset-zinc-900"
                        : "bg-emerald-300 dark:bg-emerald-800/70"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs ${
                    day.isToday
                      ? "font-semibold text-emerald-600 dark:text-emerald-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {day.weekday}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
