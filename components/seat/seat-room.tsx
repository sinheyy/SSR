"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// 한 사람이 정산될 때 users가 여러 번(total_study_seconds / streak_days /
// unlocked_items) UPDATE되고, 그때마다 접속자 전원이 무거운 재조회를 돌았다.
// 짧은 창 안에 몰려오는 이벤트를 하나로 합쳐서 재조회 횟수를 줄인다.
// 0.4초는 사람이 좌석 변화를 인지하는 데 지장 없는 수준.
const REFRESH_DEBOUNCE_MS = 400;

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

  const supabase = useMemo(() => createClient(), []);

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
  // (하트비트는 seats가 아니라 publication에 없는 seat_heartbeats 테이블에
  //  쓰이므로 realtime 브로드캐스트를 발생시키지 않는다. schema.sql 20번 참고)
  useEffect(() => {
    heartbeatSeat().catch(() => {});
    const interval = setInterval(() => {
      heartbeatSeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const pendingRef = useRef({ tables: false, rankings: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 짧은 시간에 몰려온 realtime 이벤트를 한 번의 재조회로 합친다.
    function scheduleRefresh(want: { tables?: boolean; rankings?: boolean }) {
      if (want.tables) pendingRef.current.tables = true;
      if (want.rankings) pendingRef.current.rankings = true;
      if (timerRef.current) return;

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const { tables: wantTables, rankings: wantRankings } =
          pendingRef.current;
        pendingRef.current = { tables: false, rankings: false };

        if (wantTables) {
          fetchTables(supabase).then(({ tables, error }) => {
            if (!error) setTables(tables);
          });
        }
        if (wantRankings) {
          fetchRankings(supabase).then(setRankings);
        }
      }, REFRESH_DEBOUNCE_MS);
    }

    const channel = supabase
      .channel("study-room", {
        config: { presence: { key: currentUserId } },
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats" },
        () => scheduleRefresh({ tables: true })
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        () => scheduleRefresh({ tables: true, rankings: true })
      )
      .on("presence", { event: "leave" }, ({ key }) => {
        // 같은 key(userId)로 다른 탭이 여전히 열려있으면 leave가 안 오므로
        // 여기 도달했다는 건 그 유저의 마지막 연결이 끊겼다는 뜻.
        //
        // 다만 이 이벤트는 접속자 전원이 받기 때문에, 전원이 서버 액션을
        // 호출하면 한 명 퇴장에 요청이 사람 수만큼 나간다(첫 호출만 실제로
        // 좌석을 비우고 나머지는 빈 UPDATE). 남아있는 접속자 중 userId가
        // 가장 앞선 한 명만 대표로 처리하게 해서 중복을 없앤다.
        // 대표가 처리하지 못해도 3분 뒤 서버 sweep이 받아준다.
        const present = Object.keys(channel.presenceState()).sort();
        if (present[0] !== currentUserId) return;
        clearSeatForUser(key).catch(() => {});
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [currentUserId, supabase]);

  return (
    <SeatGrid
      tables={tables}
      currentUserId={currentUserId}
      rankings={rankings}
      seatingDisabled={seatingDisabled}
    />
  );
}
