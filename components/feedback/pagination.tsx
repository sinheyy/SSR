import Link from "next/link";

export default function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`rounded-md px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 ${
          page <= 1 ? "pointer-events-none opacity-30" : ""
        }`}
        aria-label="이전 페이지"
      >
        ‹
      </Link>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={`flex size-7 items-center justify-center rounded-md text-sm font-medium ${
            p === page
              ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {p}
        </Link>
      ))}
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`rounded-md px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 ${
          page >= totalPages ? "pointer-events-none opacity-30" : ""
        }`}
        aria-label="다음 페이지"
      >
        ›
      </Link>
    </div>
  );
}
