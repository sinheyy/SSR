import SeatGrid from "@/components/seat/seat-grid";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        스터디룸
      </h1>
      <SeatGrid />
    </div>
  );
}
