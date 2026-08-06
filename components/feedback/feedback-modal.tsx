"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "@/components/feedback/actions";
import { FEEDBACK_TYPES, type FeedbackType } from "@/components/feedback/types";

export default function FeedbackModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>(FEEDBACK_TYPES[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setType(FEEDBACK_TYPES[0]);
    setTitle("");
    setContent("");
    setError(null);
  }

  function handleSubmit() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await submitFeedback(type, title, content);
        close();
      } catch (e) {
        setError(e instanceof Error ? e.message : "문의 등록에 실패했어요");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
      >
        새 문의 작성
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-5 shadow-lg dark:border-white/[.145] dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                문의/건의 남기기
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
              >
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t} value={t} className="dark:bg-zinc-900">
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                maxLength={100}
                className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 자세히 적어주세요"
                rows={5}
                maxLength={2000}
                className="resize-none rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !title.trim() || !content.trim()}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
              >
                {isPending ? "등록 중..." : "등록하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
