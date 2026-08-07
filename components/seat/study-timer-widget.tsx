"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StudyTimer from "@/components/seat/study-timer";

function todayInSeoul() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

export default function StudyTimerWidget({ userId }: { userId: string }) {
  const [baselineSeconds, setBaselineSeconds] = useState(0);
  const [sittingSince, setSittingSince] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const [{ data: seat }, { data: attendance }] = await Promise.all([
        supabase
          .from("seats")
          .select("status_changed_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("attendance_logs")
          .select("total_seconds")
          .eq("user_id", userId)
          .eq("date", todayInSeoul())
          .maybeSingle(),
      ]);
      setSittingSince(seat?.status_changed_at ?? null);
      setBaselineSeconds(attendance?.total_seconds ?? 0);
    }

    refresh();

    const channel = supabase
      .channel(`study-timer-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats" },
        refresh
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <StudyTimer
      todayBaselineSeconds={baselineSeconds}
      sittingSince={sittingSince}
    />
  );
}
