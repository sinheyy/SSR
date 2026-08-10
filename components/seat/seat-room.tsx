"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  clearSeatForUser,
  clearSeatsForExcludedHours,
  heartbeatSeat,
} from "@/components/seat/actions";
import { fetchTables } from "@/components/seat/data";
import { fetchRankings } from "@/components/seat/ranking-data";
import { isWithinExcludedHours } from "@/lib/study-time";
import SeatGrid from "@/components/seat/seat-grid";
import type { TableData } from "@/components/seat/types";
import type { Rankings } from "@/components/seat/ranking-data";

const EXCLUDED_HOURS_POLL_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export default function SeatRoom({
  initialTables,
  initialRankings,
  currentUserId,
}: {
  initialTables: TableData[];
  initialRankings: Rankings;
  currentUserId: string;
}) {
  const [tables, setTables] = useState(initialTables);
  const [rankings, setRankings] = useState(initialRankings);
  const [seatingDisabled, setSeatingDisabled] = useState(() =>
    isWithinExcludedHours()
  );

  useEffect(() => {
    if (seatingDisabled) {
      clearSeatsForExcludedHours().catch(() => {});
    }

    const interval = setInterval(() => {
      const now = isWithinExcludedHours();
      setSeatingDisabled((prev) => {
        if (!prev && now) {
          clearSeatsForExcludedHours().catch(() => {});
        }
        return now;
      });
    }, EXCLUDED_HOURS_POLL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 좌석에 앉아있는 동안 살아있다는 신호를 서버에 주기적으로 보낸다.
  // presence leave를 목격해줄 다른 클라이언트가 없어서 탭을 그냥 닫아도
  // 좌석이 영원히 안 비워지는 문제의 백스톱 — 이 신호가 3분 넘게 끊기면
  // 서버(pg_cron)가 자동으로 좌석을 정리한다.
  useEffect(() => {
    heartbeatSeat().catch(() => {});
    const interval = setInterval(() => {
      heartbeatSeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

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
          fetchRankings(supabase).then(setRankings);
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

  return (
    <SeatGrid
      tables={tables}
      currentUserId={currentUserId}
      rankings={rankings}
      seatingDisabled={seatingDisabled}
    />
  );
}