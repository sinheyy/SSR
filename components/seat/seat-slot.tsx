"use client";

import { useEffect, useState, useTransition } from "react";
import { leaveSeat, sitAtSeat } from "@/components/seat/actions";
import type { SeatData } from "@/components/seat/types";

const AVATAR_COLORS = [
  "bg-orange-300 dark:bg-orange-800/70",
  "bg-pink-300 dark:bg-pink-800/70",
  "bg-emerald-300 dark:bg-emerald-800/70",
  "bg-sky-300 dark:bg-sky-800/70",
  "bg-violet-300 dark:bg-violet-800/70",
];

function useElapsedTime(since: string | null) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!since) return;
    const sinceMs = new Date(since).getTime();
    const tick = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - sinceMs) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [since]);

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

export default function SeatSlot({
  seat,
  currentUserId,
}: {
  seat: SeatData;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isMine = seat.occupant?.userId === currentUserId;
  const elapsed = useElapsedTime(seat.occupant?.sittingSince ?? null);

  function handleClick() {
    if (isPending) return;
    startTransition(async () => {
      if (seat.occupant) {
        if (isMine) {
          await leaveSeat();
        }
        return;
      }
      await sitAtSeat(seat.id);
    });
  }

  if (!seat.occupant) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="size-7 rounded-md border-2 border-dashed border-[#c9b28c] transition hover:border-[#8a6448] disabled:opacity-50 dark:border-[#5a4a34] dark:hover:border-[#c9b28c]"
        aria-label={`${seat.position + 1}번 자리, 비어있음`}
      />
    );
  }

  const colorClass = AVATAR_COLORS[seat.position % AVATAR_COLORS.length];

  return (
    <div className="relative">
      {isMine && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-[#5a4a34] dark:text-[#c9b28c]">
          {elapsed}
        </span>
      )}
      <button
        type="button"
        onClick={isMine ? handleClick : undefined}
        disabled={isPending || !isMine}
        className={`flex size-7 items-center justify-center gap-1 rounded-md shadow-sm ${colorClass} ${
          isMine ? "ring-2 ring-emerald-500" : ""
        } disabled:opacity-90`}
        aria-label={`${seat.position + 1}번 자리, ${seat.occupant.name}${isMine ? " (나)" : ""}`}
        title={seat.occupant.name}
      >
        <span className="size-1 rounded-full bg-black/50" />
        <span className="size-1 rounded-full bg-black/50" />
      </button>
    </div>
  );
}
