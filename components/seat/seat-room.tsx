"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearSeatForUser, clearSeatsForExcludedHours } from "@/components/seat/actions";
import { fetchTables } from "@/components/seat/data";
import { fetchRankings } from "@/components/seat/ranking-data";
import { isWithinExcludedHours } from "@/lib/study-time";
import SeatGrid from "@/components/seat/seat-grid";
import type { TableData } from "@/components/seat/types";
import type { Rankings } from "@/components/seat/ranking-data";

const EXCLUDED_HOURS_POLL_MS = 30_000;

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