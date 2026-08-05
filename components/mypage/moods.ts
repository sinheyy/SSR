export const MOODS = ["집중중", "졸려요", "신남", "피곤"] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_EMOJI: Record<Mood, string> = {
  집중중: "📚",
  졸려요: "😴",
  신남: "🤩",
  피곤: "😩",
};

export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}
