import type { SeatData } from "@/components/seat/types";

const AVATAR_COLORS = [
  "bg-orange-300 dark:bg-orange-800/70",
  "bg-pink-300 dark:bg-pink-800/70",
  "bg-emerald-300 dark:bg-emerald-800/70",
  "bg-sky-300 dark:bg-sky-800/70",
  "bg-violet-300 dark:bg-violet-800/70",
];

export default function SeatSlot({ seat }: { seat: SeatData }) {
  if (!seat.occupant) {
    return (
      <div
        className="size-7 rounded-md border-2 border-dashed border-[#c9b28c] dark:border-[#5a4a34]"
        aria-label={`${seat.position + 1}번 자리, 비어있음`}
      />
    );
  }

  const colorClass = AVATAR_COLORS[seat.position % AVATAR_COLORS.length];

  return (
    <div
      className={`flex size-7 items-center justify-center gap-1 rounded-md shadow-sm ${colorClass}`}
      aria-label={`${seat.position + 1}번 자리, ${seat.occupant.name}`}
      title={seat.occupant.name}
    >
      <span className="size-1 rounded-full bg-black/50" />
      <span className="size-1 rounded-full bg-black/50" />
    </div>
  );
}
