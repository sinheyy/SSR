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
    <div className="flex items-baseline gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <span>오늘 공부 시간</span>
      <span className="font-mono text-lg font-semibold text-black dark:text-zinc-50">
        {formatDuration(liveSeconds)}
      </span>
    </div>
  );
}
