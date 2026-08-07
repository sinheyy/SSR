"use client";

import { useState, useTransition } from "react";
import { replyToFeedback } from "@/components/feedback/actions";
import type { FeedbackItem } from "@/components/feedback/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const [reply, setReply] = useState(item.reply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await replyToFeedback(item.id, reply);
      } catch (e) {
        setError(e instanceof Error ? e.message : "답변 등록에 실패했어요");
      }
    });
  }

  return (
    <li className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {item.type}
          </span>
          <h3 className="font-semibold text-black dark:text-zinc-50">
            {item.title}
          </h3>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            item.reply
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          {item.reply ? "답변완료" : "답변대기"}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
        {item.userName} · {formatDate(item.createdAt)}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {item.content}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="답변을 입력하세요"
          rows={3}
          maxLength={2000}
          className="resize-none rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !reply.trim()}
          className="self-end rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
        >
          {isPending ? "저장 중..." : item.reply ? "답변 수정" : "답변 등록"}
        </button>
      </div>
    </li>
  );
}

export default function AdminFeedbackList({
  items,
}: {
  items: FeedbackItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        해당하는 문의가 없어요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <FeedbackRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
