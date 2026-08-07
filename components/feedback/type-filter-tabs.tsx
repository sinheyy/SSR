import Link from "next/link";
import { FEEDBACK_TYPES, type FeedbackType } from "@/components/feedback/types";

export default function TypeFilterTabs({
  activeType,
  total,
  byType,
}: {
  activeType: FeedbackType | null;
  total: number;
  byType: Record<FeedbackType, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link
        href="/admin/feedback"
        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
          activeType === null
            ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
        }`}
      >
        전체 {total}
      </Link>
      {FEEDBACK_TYPES.map((t) => (
        <Link
          key={t}
          href={`/admin/feedback?type=${encodeURIComponent(t)}`}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            activeType === t
              ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
          }`}
        >
          {t} {byType[t]}
        </Link>
      ))}
    </div>
  );
}
