export const MOODS = ["집중중", "졸려요", "신나요", "피곤해요", "배고파요"] as const;

export type Mood = (typeof MOODS)[number];

export const MOOD_EMOJI: Record<Mood, string> = {
  집중중: "📚",
  졸려요: "😴",
  신나요: "🤩",
  피곤해요: "😩",
  배고파요: "🍔",
};

export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}
