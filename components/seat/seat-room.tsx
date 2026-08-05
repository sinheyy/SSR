"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearSeatForUser } from "@/components/seat/actions";
import { fetchTables } from "@/components/seat/data";
import SeatGrid from "@/components/seat/seat-grid";
import StudyTimer from "@/components/seat/study-timer";
import type { TableData } from "@/components/seat/types";

export default function SeatRoom({
  initialTables,
  currentUserId,
  todayBaselineSeconds,
}: {
  initialTables: TableData[];
  currentUserId: string;
  todayBaselineSeconds: number;
}) {
  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("study-room", {
        config: { presence: { key: currentUserId } },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats" },
        () => {
          fetchTables(supabase).then(({ tables, error }) => {
            if (!error) setTables(tables);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        () => {
          fetchTables(supabase).then(({ tables, error }) => {
            if (!error) setTables(tables);
          });
        }
      )
      .on("presence", { event: "leave" }, ({ key }) => {
        // 같은 key(userId)로 다른 탭이 여전히 열려있으면 leave가 안 오므로
        // 여기 도달했다는 건 그 유저의 마지막 연결이 끊겼다는 뜻
        clearSeatForUser(key).catch(() => {});
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const mySeat = tables
    .flatMap((table) => table.seats)
    .find((seat) => seat.occupant?.userId === currentUserId);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          스터디룸
        </h1>
        <StudyTimer
          todayBaselineSeconds={todayBaselineSeconds}
          sittingSince={mySeat?.occupant?.sittingSince ?? null}
        />
      </div>
      <SeatGrid tables={tables} currentUserId={currentUserId} />
    </>
  );
}
