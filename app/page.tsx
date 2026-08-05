import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchTables } from "@/components/seat/data";
import { fetchRankings } from "@/components/seat/ranking-data";
import SeatRoom from "@/components/seat/seat-room";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { tables, error } = await fetchTables(supabase);
  const rankings = await fetchRankings(supabase);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
  const { data: attendance } = await supabase
    .from("attendance_logs")
    .select("total_seconds")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      {error ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            스터디룸
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            좌석 정보를 불러오지 못했습니다.
          </p>
        </>
      ) : (
        <SeatRoom
          initialTables={tables}
          initialRankings={rankings}
          currentUserId={user.id}
          todayBaselineSeconds={attendance?.total_seconds ?? 0}
        />
      )}
    </div>
  );
}
