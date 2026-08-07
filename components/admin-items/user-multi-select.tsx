"use client";

import { useState } from "react";

export default function UserMultiSelect({
  users,
  selectedIds,
  onChange,
}: {
  users: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = users.filter((u) => selectedIds.includes(u.id));
  const filtered = users.filter(
    (u) => !selectedIds.includes(u.id) && u.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:hover:bg-emerald-900"
            >
              {u.name} ✕
            </button>
          ))}
        </div>
      )}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="이름으로 검색"
        className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
      />
      <div className="max-h-40 overflow-y-auto rounded-md border border-black/[.08] dark:border-white/[.145]">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-xs text-zinc-500">검색 결과 없음</p>
        ) : (
          filtered.map((u) => (
            <button
              key={u.id}
              onClick={() => toggle(u.id)}
              className="block w-full px-3 py-1.5 text-left text-sm text-black hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800"
            >
              {u.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
