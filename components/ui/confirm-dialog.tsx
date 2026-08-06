"use client";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-5 shadow-lg dark:border-white/[.145] dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-black/[.08] px-3 py-1.5 text-sm font-medium text-zinc-600 dark:border-white/[.145] dark:text-zinc-400"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white transition ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-black hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}