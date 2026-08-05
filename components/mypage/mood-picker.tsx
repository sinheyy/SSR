"use client";

import { useTransition } from "react";
import { updateMood } from "@/components/mypage/actions";
import { MOOD_EMOJI, MOODS, type Mood } from "@/components/mypage/moods";

export default function MoodPicker({ mood }: { mood: Mood | null }) {
  const [isPending, startTransition] = useTransition();

  function handleSelect(next: Mood) {
    if (isPending || next === mood) return;
    startTransition(async () => {
      await updateMood(next);
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
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
    </div>
  );
}
