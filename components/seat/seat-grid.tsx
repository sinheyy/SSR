import TableUnit from "@/components/seat/table-unit";
import type { TableData } from "@/components/seat/types";

// 3단계(실데이터 연동)에서 Supabase 조회로 대체될 임시 목업 데이터
function getMockTables(): TableData[] {
  const layouts: { name: string; capacity: 4 | 6 }[] = [
    { name: "테이블 1", capacity: 6 },
    { name: "테이블 2", capacity: 6 },
    { name: "테이블 3", capacity: 6 },
    { name: "테이블 4", capacity: 6 },
    { name: "테이블 5", capacity: 4 },
    { name: "테이블 6", capacity: 4 },
    { name: "테이블 7", capacity: 4 },
    { name: "테이블 8", capacity: 4 },
  ];
  const sampleNames = ["지민", "서연", "도윤", "하은"];

  return layouts.map((layout, tableIndex) => ({
    id: `table-${tableIndex}`,
    name: layout.name,
    capacity: layout.capacity,
    seats: Array.from({ length: layout.capacity }, (_, position) => {
      const isOccupied = (tableIndex + position) % 3 === 0;
      return {
        id: `table-${tableIndex}-seat-${position}`,
        position,
        occupant: isOccupied
          ? { name: sampleNames[(tableIndex + position) % sampleNames.length] }
          : null,
      };
    }),
  }));
}

function Window() {
  return (
    <div className="relative size-9 rounded-md border-4 border-[#8a6448] bg-sky-200 dark:bg-sky-900">
      <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-white/80" />
      <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-white/80" />
    </div>
  );
}

function Plant() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-0 w-0 border-x-8 border-b-[14px] border-x-transparent border-b-emerald-600" />
      <div className="h-3 w-5 rounded-sm bg-[#8a6448]" />
    </div>
  );
}

export default function SeatGrid() {
  const tables = getMockTables();

  return (
    <div className="overflow-hidden rounded-3xl border border-[#c9b28c] bg-[#f0e4d0] shadow-sm dark:border-[#4a3d2a] dark:bg-[#3a2f20]">
      <div className="flex items-center justify-around border-b border-[#c9b28c] bg-[#d9c6a0] px-8 py-5 dark:border-[#4a3d2a] dark:bg-[#4a3d2a]">
        <Window />
        <Window />
        <Window />
        <Window />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 px-8 py-10 sm:grid-cols-4">
        {tables.map((table) => (
          <TableUnit key={table.id} table={table} />
        ))}
      </div>
      <div className="flex items-end justify-between px-6 pb-4">
        <Plant />
        <Plant />
      </div>
    </div>
  );
}
