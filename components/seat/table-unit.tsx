import SeatSlot from "@/components/seat/seat-slot";
import type { TableData } from "@/components/seat/types";

export default function TableUnit({
  table,
  currentUserId,
}: {
  table: TableData;
  currentUserId: string;
}) {
  const half = Math.ceil(table.seats.length / 2);
  const topSeats = table.seats.slice(0, half);
  const bottomSeats = table.seats.slice(half);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-1.5">
        {topSeats.map((seat) => (
          <SeatSlot key={seat.id} seat={seat} currentUserId={currentUserId} />
        ))}
      </div>
      <div className="flex w-28 items-center justify-center rounded-xl border-2 border-[#8a6448] bg-[#b98a5e] py-4 text-sm font-semibold text-white shadow-sm dark:border-[#5a4a34] dark:bg-[#7a5c3e]">
        {table.name}
      </div>
      <div className="flex gap-1.5">
        {bottomSeats.map((seat) => (
          <SeatSlot key={seat.id} seat={seat} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}
