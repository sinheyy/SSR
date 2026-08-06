import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileCard from "@/components/mypage/profile-card";
import StatsPanel, { type DailyStudy } from "@/components/mypage/stats-panel";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function recentDates(todayStr: string, days: number) {
  const [y, m, d] = todayStr.split("-").map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(anchor - (days - 1 - i) * 86_400_000);
    return {
      date: date.toISOString().slice(0, 10),
      weekday: WEEKDAY_LABELS[date.getUTCDay()],
    };
  });
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const days = recentDates(todayStr, 7);

  const [{ data: profile }, { data: attendance }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "name, email, avatar_url, avatar_color, class, mood, total_study_seconds, streak_days, titles(name)"
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("attendance_logs")
      .select("date, total_seconds")
      .eq("user_id", user.id)
      .gte("date", days[0].date),
  ]);

  const secondsByDate = new Map(
    (attendance ?? []).map((row) => [row.date, row.total_seconds ?? 0])
  );

  const dailyHistory: DailyStudy[] = days.map((day) => ({
    date: day.date,
    weekday: day.weekday,
    seconds: secondsByDate.get(day.date) ?? 0,
    isToday: day.date === todayStr,
  }));

  const equippedTitle = profile?.titles as { name: string } | { name: string }[] | null;
  const titleName = Array.isArray(equippedTitle)
    ? (equippedTitle[0]?.name ?? null)
    : (equippedTitle?.name ?? null);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        마이페이지
      </h1>

      <ProfileCard
        userId={user.id}
        name={profile?.name ?? user.user_metadata?.name ?? "이름 없음"}
        email={profile?.email ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        avatarColor={profile?.avatar_color ?? null}
        className={profile?.class ?? null}
        mood={profile?.mood ?? null}
        titleName={titleName}
      />

      <StatsPanel
        totalStudySeconds={profile?.total_study_seconds ?? 0}
        streakDays={profile?.streak_days ?? 0}
        dailyHistory={dailyHistory}
      />
    </div>
  );
}
