"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { leaveSeat, sitAtSeat } from "@/components/seat/actions";
import type { SeatData } from "@/components/seat/types";
import { colorForUser } from "@/lib/avatar-color";
import { updateMood } from "@/components/mypage/actions";
import { isMood, MOOD_EMOJI, MOODS, type Mood } from "@/components/mypage/moods";

function MoodBubble({
  mood,
  isMine,
}: {
  mood: string | null;
  isMine: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ bottom: number; left: number } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!mood || !isMood(mood)) return null;

  function openPicker() {
    if (!isMine) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setAnchor({ bottom: window.innerHeight - rect.top + 8, left: rect.left + rect.width / 2 });
    }
    setOpen(true);
  }

  function handleSelect(next: Mood) {
    if (isPending) return;
    setOpen(false);
    if (next === mood) return;
    startTransition(async () => {
      await updateMood(next);
    });
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openPicker}
        disabled={!isMine}
        className={`absolute -top-2.5 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center drop-shadow-sm ${
          isMine ? "cursor-pointer" : "cursor-default"
        }`}
        aria-label={isMine ? "기분 바꾸기" : undefined}
      >
        <div className="flex size-7 items-center justify-center rounded-full border border-black/10 bg-white text-base leading-none dark:border-white/10 dark:bg-zinc-800">
          {MOOD_EMOJI[mood]}
        </div>
        <div
          className="-mt-1.5 h-2.5 w-3 bg-white dark:bg-zinc-800"
          style={{ clipPath: "polygon(15% 0%, 85% 0%, 35% 100%)" }}
        />
      </button>

      {open &&
        anchor &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div
              style={{
                position: "fixed",
                bottom: anchor.bottom,
                left: anchor.left,
                transform: "translateX(-50%)",
              }}
              className="z-50 flex items-center gap-1 rounded-full border border-black/10 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-zinc-800"
            >
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelect(m)}
                  disabled={isPending}
                  className={`flex size-8 items-center justify-center rounded-full text-lg transition disabled:opacity-50 ${
                    m === mood
                      ? "bg-emerald-100 ring-2 ring-emerald-500 dark:bg-emerald-900/50"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  }`}
                  aria-label={m}
                >
                  {MOOD_EMOJI[m]}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </>
  );
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltipAnchor, setTooltipAnchor] = useState<{ bottom: number; left: number } | null>(
    null
  );

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

  function showTooltip() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltipAnchor({
        bottom: window.innerHeight - rect.top + 44,
        left: rect.left + rect.width / 2,
      });
    }
  }

  if (!seat.occupant) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="size-9 rounded-md border-2 border-dashed border-[#c9b28c] transition hover:border-[#8a6448] disabled:opacity-50 dark:border-[#5a4a34] dark:hover:border-[#c9b28c]"
        aria-label={`${seat.position + 1}번 자리, 비어있음`}
      />
    );
  }

  const colorClass = colorForUser(seat.occupant.userId, seat.occupant.avatarColor);

  return (
    <div ref={wrapRef} className="relative">
      <MoodBubble
        mood={seat.occupant.showMood ? seat.occupant.mood : null}
        isMine={isMine}
      />
      <button
        type="button"
        onClick={isMine ? handleClick : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipAnchor(null)}
        disabled={isPending}
        className={`relative flex size-9 items-center justify-center gap-1.5 rounded-md shadow-sm ${colorClass} ${
          isMine ? "ring-2 ring-emerald-500" : "cursor-default"
        } disabled:opacity-90`}
        aria-label={`${seat.position + 1}번 자리, ${seat.occupant.name}${isMine ? " (나)" : ""}`}
      >
        <span className="size-1.5 rounded-full bg-black/50" />
        <span className="size-1.5 rounded-full bg-black/50" />
        {seat.occupant.customItems?.map((item, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={item.image}
            alt=""
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 object-contain"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          />
        ))}
      </button>
      <span
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipAnchor(null)}
        className="absolute left-1/2 top-full z-10 mt-1 w-9 -translate-x-1/2 truncate text-center text-[9px] font-medium leading-none text-zinc-600 dark:text-zinc-300"
      >
        {seat.occupant.name}
      </span>

      {tooltipAnchor &&
        createPortal(
          <div
            style={{
              position: "fixed",
              bottom: tooltipAnchor.bottom,
              left: tooltipAnchor.left,
              transform: "translateX(-50%)",
            }}
            className="pointer-events-none z-50 whitespace-nowrap rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-black shadow-lg dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {seat.occupant.name}
          </div>,
          document.body
        )}
    </div>
  );
}