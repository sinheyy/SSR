"use client";

import { useTransition } from "react";
import { leaveSeat, sitAtSeat } from "@/components/seat/actions";
import type { SeatData } from "@/components/seat/types";

const AVATAR_COLORS = [
  "bg-orange-300 dark:bg-orange-800/70",
  "bg-pink-300 dark:bg-pink-800/70",
  "bg-emerald-300 dark:bg-emerald-800/70",
  "bg-sky-300 dark:bg-sky-800/70",
  "bg-violet-300 dark:bg-violet-800/70",
];

function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

  const colorClass = colorForUser(seat.occupant.userId);

  return (
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
  );
}
