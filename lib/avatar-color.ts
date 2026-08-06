// 무지개 순서(빨→보) + 핑크. 5개씩 2줄로 깔끔하게 배치되도록 정확히 10개만 유지.
export const AVATAR_COLORS = [
  "bg-rose-300 dark:bg-rose-800/70",
  "bg-orange-300 dark:bg-orange-800/70",
  "bg-amber-300 dark:bg-amber-800/70",
  "bg-lime-300 dark:bg-lime-800/70",
  "bg-emerald-300 dark:bg-emerald-800/70",
  "bg-teal-300 dark:bg-teal-800/70",
  "bg-sky-300 dark:bg-sky-800/70",
  "bg-indigo-300 dark:bg-indigo-800/70",
  "bg-violet-300 dark:bg-violet-800/70",
  "bg-pink-300 dark:bg-pink-800/70",
];

export function colorForUser(userId: string, override?: string | null) {
  if (override && AVATAR_COLORS.includes(override)) {
    return override;
  }
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
