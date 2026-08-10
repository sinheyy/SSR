import TableUnit from "@/components/seat/table-unit";
import RankingBoard from "@/components/seat/ranking-board";
import StudyTimerWidget from "@/components/seat/study-timer-widget";
import WhiteboardIcon from "@/components/whiteboard/whiteboard-icon";
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
  seatingDisabled,
}: {
  tables: TableData[];
  currentUserId: string;
  rankings: Rankings;
  seatingDisabled: boolean;
}) {
  // 공부 타이머가 쓰는 "내 착석 시각". 이미 tables에 들어있는 값이라
  // StudyTimerWidget이 seats를 따로 구독/조회할 필요가 없다.
  const mySittingSince =
    tables
      .flatMap((table) => table.seats)
      .find((seat) => seat.occupant?.userId === currentUserId)?.occupant
      ?.sittingSince ?? null;

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
        <WhiteboardIcon />
        <Window />
        <StudyTimerWidget
          userId={currentUserId}
          sittingSince={mySittingSince}
        />
      </div>
      {seatingDisabled && (
        <p className="bg-amber-100 px-8 py-2 text-center text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          평일 09:00~17:50에는 착석할 수 없어요
        </p>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 px-8 py-10 sm:grid-cols-4">
        {tables.map((table) => (
          <TableUnit
            key={table.id}
            table={table}
            currentUserId={currentUserId}
            seatingDisabled={seatingDisabled}
          />
        ))}
      </div>
      <div className="flex items-end justify-between px-6 pb-4">
        <Plant />
        <Plant />
      </div>
    </div>
  );
}
