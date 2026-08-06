import TableUnit from "@/components/seat/table-unit";
import RankingBoard from "@/components/seat/ranking-board";
import StudyTimerWidget from "@/components/seat/study-timer-widget";
import type { Rankings } from "@/components/seat/ranking-data";
import type { TableData } from "@/components/seat/types";

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

export default function SeatGrid({
  tables,
  currentUserId,
  rankings,
}: {
  tables: TableData[];
  currentUserId: string;
  rankings: Rankings;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#c9b28c] bg-[#f0e4d0] shadow-sm dark:border-[#4a3d2a] dark:bg-[#3a2f20]">
      <div className="flex items-center justify-around border-b border-[#c9b28c] bg-[#d9c6a0] px-8 py-7 dark:border-[#4a3d2a] dark:bg-[#4a3d2a]">
        <Window />
        <RankingBoard
          title="시간랭킹"
          icon="⏱️"
          kind="time"
          entries={rankings.byTime}
        />
        <RankingBoard
          title="출석랭킹"
          icon="🔥"
          kind="streak"
          entries={rankings.byStreak}
        />
        <Window />
        <Window />
        <Window />
        <StudyTimerWidget userId={currentUserId} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 px-8 py-10 sm:grid-cols-4">
        {tables.map((table) => (
          <TableUnit key={table.id} table={table} currentUserId={currentUserId} />
        ))}
      </div>
      <div className="flex items-end justify-between px-6 pb-4">
        <Plant />
        <Plant />
      </div>
    </div>
  );
}
