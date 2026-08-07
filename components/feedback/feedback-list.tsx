"use client";

import { useState, useTransition } from "react";
import { deleteFeedback, updateFeedback } from "@/components/feedback/actions";
import { FEEDBACK_TYPES, type FeedbackItem, type FeedbackType } from "@/components/feedback/types";
import ConfirmDialog from "@/components/ui/confirm-dialog";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<FeedbackType>(item.type);
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canEdit = !item.reply;

  function cancelEdit() {
    setEditing(false);
    setType(item.type);
    setTitle(item.title);
    setContent(item.content);
    setError(null);
  }

  function handleSave() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateFeedback(item.id, type, title, content);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "수정에 실패했어요");
      }
    });
  }

  function handleDelete() {
    if (isPending) return;
    setConfirmingDelete(false);
    setError(null);
    startTransition(async () => {
      try {
        await deleteFeedback(item.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제에 실패했어요");
      }
    });
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900">
        <div className="flex flex-col gap-2">
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
            maxLength={100}
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            className="resize-none rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={isPending}
              className="rounded-md border border-black/[.08] px-3 py-1.5 text-sm font-medium text-zinc-600 disabled:opacity-40 dark:border-white/[.145] dark:text-zinc-400"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !title.trim() || !content.trim()}
              className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
            >
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </li>
    );
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
        {formatDate(item.createdAt)}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
        {item.content}
      </p>

      {item.reply && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/60">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            답변{item.repliedAt ? ` · ${formatDate(item.repliedAt)}` : ""}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-black dark:text-zinc-50">
            {item.reply}
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

      <div className="mt-3 flex justify-end gap-3 text-xs font-medium">
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            수정
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={isPending}
          className="text-red-500 hover:text-red-600 disabled:opacity-40"
        >
          삭제
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="이 문의를 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요."
        confirmLabel="삭제"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  );
}

export default function FeedbackList({ items }: { items: FeedbackItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        아직 남긴 문의가 없어요.
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
