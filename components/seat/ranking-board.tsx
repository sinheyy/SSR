"use client";

import { useState } from "react";
import { colorForUser } from "@/lib/avatar-color";
import type { RankingEntry } from "@/components/seat/ranking-data";

function formatValue(kind: "time" | "streak", value: number) {
  if (kind === "streak") return `${value}일`;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours === 0) return `${minutes}분`;
  return `${hours}시간 ${minutes}분`;
}

export default function RankingBoard({
  title,
  icon,
  kind,
  entries,
}: {
  title: string;
  icon: string;
  kind: "time" | "streak";
  entries: RankingEntry[];
}) {
  const [open, setOpen] = useState(false);
  const top3 = entries.slice(0, 3);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-20 w-36 flex-col items-center justify-center gap-1 rounded-lg border-4 border-[#8a6448] bg-[#e8d9b8] px-2 py-1.5 shadow-sm transition hover:brightness-105 dark:border-[#5a4a34] dark:bg-[#5a4a34]"
        aria-label={`${title} 랭킹 top 10 보기`}
      >
        <span className="text-xs font-bold leading-none text-[#5a4632] dark:text-[#e8d9b8]">
          {icon} {title}
        </span>
        <span className="flex w-full flex-col gap-0.5">
          {top3.length === 0 ? (
            <span className="text-[11px] leading-none text-[#8a7358] dark:text-[#c9b28c]">
              기록 없음
            </span>
          ) : (
            top3.map((entry, i) => (
              <span
                key={entry.userId}
                className="flex items-center gap-1.5 text-[11px] leading-tight text-[#5a4632] dark:text-[#e8d9b8]"
              >
                <span className="w-3.5 shrink-0 font-semibold">{i + 1}</span>
                <span className="truncate">{entry.name}</span>
              </span>
            ))
          )}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-5 shadow-lg dark:border-white/[.145] dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                {icon} {title} TOP 10
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {entries.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                아직 기록이 없어요.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {entries.map((entry, i) => (
                  <li
                    key={entry.userId}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-base odd:bg-zinc-50 dark:odd:bg-zinc-800/60"
                  >
                    <span className="w-6 shrink-0 text-center font-semibold text-zinc-500 dark:text-zinc-400">
                      {i + 1}
                    </span>
                    <span
                      className={`relative flex size-7 shrink-0 items-center justify-center gap-1 rounded-md shadow-sm ${colorForUser(entry.userId, entry.avatarColor)}`}
                      aria-hidden
                    >
                      <span className="size-1 rounded-full bg-black/50" />
                      <span className="size-1 rounded-full bg-black/50" />
                      {entry.customItems.map((item, itemIndex) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={itemIndex}
                          src={item.image}
                          alt=""
                          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 object-contain"
                          style={{ left: `${item.x}%`, top: `${item.y}%` }}
                        />
                      ))}
                    </span>
                    <span className="flex-1 truncate text-black dark:text-zinc-50">
                      {entry.name}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-black dark:text-zinc-50">
                      {formatValue(kind, entry.value)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </>
  );
}
