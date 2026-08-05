export const AVATAR_COLORS = [
  "bg-orange-300 dark:bg-orange-800/70",
  "bg-pink-300 dark:bg-pink-800/70",
  "bg-emerald-300 dark:bg-emerald-800/70",
  "bg-sky-300 dark:bg-sky-800/70",
  "bg-violet-300 dark:bg-violet-800/70",
];

export function colorForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
