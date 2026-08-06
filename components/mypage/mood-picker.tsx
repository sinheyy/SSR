"use client";

import { useTransition } from "react";
import { updateMood, updateMoodVisibility } from "@/components/mypage/actions";
import { MOOD_EMOJI, MOODS, type Mood } from "@/components/mypage/moods";

export default function MoodPicker({
  mood,
  showMood,
}: {
  mood: Mood | null;
  showMood: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isVisibilityPending, startVisibilityTransition] = useTransition();

  function handleSelect(next: Mood) {
    if (isPending || next === mood) return;
    startTransition(async () => {
      await updateMood(next);
    });
  }

  function handleToggleVisibility() {
    if (isVisibilityPending) return;
    startVisibilityTransition(async () => {
      await updateMoodVisibility(!showMood);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {MOODS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => handleSelect(m)}
          disabled={isPending}
          aria-pressed={m === mood}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
            m === mood
              ? "bg-emerald-500 text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          }`}
        >
          {MOOD_EMOJI[m]} {m}
        </button>
      ))}
      <button
        type="button"
        onClick={handleToggleVisibility}
        disabled={isVisibilityPending}
        className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        {showMood ? "🙈 스터디룸에 숨기기" : "👁 스터디룸에 표시하기"}
      </button>
    </div>
  );
}