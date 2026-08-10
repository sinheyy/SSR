"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import StudyTimer from "@/components/seat/study-timer";

function todayInSeoul() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

// sittingSince는 SeatRoom이 이미 들고 있는 tables에서 뽑아 내려준다.
// 예전에는 이 위젯이 seats 테이블을 통째로(event: "*", 필터 없이) 따로
// 구독하면서 이벤트마다 seats + attendance_logs를 조회했는데, 정작 필요한
// 건 "내 좌석" 하나뿐이라 남이 앉거나 하트비트가 뛸 때마다 접속자 전원이
// 쿼리 2개를 날리는 꼴이었다. 구독과 seats 조회를 아예 없애고, 오늘 누적
// 시간(attendance_logs)만 착석 상태가 바뀌는 순간에 다시 읽는다.
export default function StudyTimerWidget({
  userId,
  sittingSince,
}: {
  userId: string;
  sittingSince: string | null;
}) {
  const [baselineSeconds, setBaselineSeconds] = useState(0);

  // sittingSince가 바뀌는 순간 = 내가 앉거나 일어난 순간. 일어난 경우엔
  // 서버가 이미 정산을 끝낸 뒤라(퇴장 처리가 커밋된 후에 realtime 이벤트가
  // 오므로) 여기서 읽으면 방금 정산분이 반영된 값이 온다.
  useEffect(() => {
    let cancelled = false;

    createClient()
      .from("attendance_logs")
      .select("total_seconds")
      .eq("user_id", userId)
      .eq("date", todayInSeoul())
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setBaselineSeconds(data?.total_seconds ?? 0);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, sittingSince]);

  return (
    <StudyTimer
      todayBaselineSeconds={baselineSeconds}
      sittingSince={sittingSince}
    />
  );
}
