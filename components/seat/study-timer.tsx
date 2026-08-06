"use client";

import { useEffect, useState } from "react";

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function StudyTimer({
  todayBaselineSeconds,
  sittingSince,
}: {
  todayBaselineSeconds: number;
  sittingSince: string | null;
}) {
  const [liveSeconds, setLiveSeconds] = useState(todayBaselineSeconds);

  useEffect(() => {
    const applyBaseline = () => setLiveSeconds(todayBaselineSeconds);

    if (!sittingSince) {
      applyBaseline();
      return;
    }

    const sinceMs = new Date(sittingSince).getTime();
    const tick = () =>
      setLiveSeconds(
        todayBaselineSeconds + Math.max(0, Math.floor((Date.now() - sinceMs) / 1000))
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayBaselineSeconds, sittingSince]);

  return (
    <div className="relative flex size-28 shrink-0 flex-col items-center justify-center gap-1 rounded-full border-4 border-[#8a6448] bg-[#fbf3e3] shadow-sm dark:border-[#5a4a34] dark:bg-[#4a3d2a]">
      <span className="absolute top-2 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-[#8a6448]/60 dark:bg-[#e8d9b8]/50" />
      <span className="absolute bottom-2 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-[#8a6448]/60 dark:bg-[#e8d9b8]/50" />
      <span className="absolute left-2 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-[#8a6448]/60 dark:bg-[#e8d9b8]/50" />
      <span className="absolute right-2 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-[#8a6448]/60 dark:bg-[#e8d9b8]/50" />
      <span className="text-[10px] font-semibold leading-none text-[#8a6448] dark:text-[#c9b28c]">
        오늘 공부
      </span>
      <span className="font-mono text-base font-bold leading-none text-[#5a4632] dark:text-[#e8d9b8]">
        {formatDuration(liveSeconds)}
      </span>
    </div>
  );
}