"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-16 text-center dark:bg-black">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        문제가 발생했습니다
      </h2>
      <button
        onClick={() => unstable_retry()}
        className="h-10 rounded-full border border-black/[.08] px-5 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        다시 시도
      </button>
    </div>
  );
}
