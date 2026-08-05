"use client";

import { useTransition } from "react";
import { leaveSeat, sitAtSeat } from "@/components/seat/actions";
import { colorForUser } from "@/components/seat/avatar-color";
import type { SeatData } from "@/components/seat/types";

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
      className={`relative flex size-7 items-center justify-center gap-1 rounded-md shadow-sm ${colorClass} ${
        isMine ? "ring-2 ring-emerald-500" : ""
      } disabled:opacity-90`}
      aria-label={`${seat.position + 1}번 자리, ${seat.occupant.name}${isMine ? " (나)" : ""}`}
      title={seat.occupant.name}
    >
      <span className="size-1 rounded-full bg-black/50" />
      <span className="size-1 rounded-full bg-black/50" />
      {seat.occupant.customItems?.map((item, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={item.image}
          alt=""
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 object-contain"
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        />
      ))}
    </button>
  );
}
