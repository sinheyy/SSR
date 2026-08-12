"use client";

import { useState, useTransition } from "react";
import { updateName } from "@/components/mypage/actions";
import {
  composeDisplayName,
  parseDisplayName,
  validateNameParts,
  CLASS_NUMBERS,
  GENERATIONS,
  REAL_NAME_MAX_LENGTH,
  REGIONS,
  type NameParts,
} from "@/lib/display-name";

const fieldClass =
  "min-w-0 rounded-md border border-black/[.12] bg-white px-2 py-1 text-sm text-black outline-none focus:border-emerald-500 dark:border-white/[.18] dark:bg-zinc-800 dark:text-zinc-50";

// 슬랙 프로필에 이름만 적어둔 사람은 "윤신혜"처럼 넘어오기 때문에,
// 기존 이름이 형식에 안 맞으면 실명 칸에만 채워두고 나머지를 직접
// 입력하게 한다.
function initialParts(name: string): NameParts {
  return (
    parseDisplayName(name) ?? {
      generation: "",
      region: "",
      classNo: "",
      realName: name.trim(),
    }
  );
}

export default function NameEditor({ name }: { name: string }) {
  const [editing, setEditing] = useState(false);
  const [parts, setParts] = useState<NameParts>(() => initialParts(name));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setPart(key: keyof NameParts, value: string) {
    setParts((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleCancel() {
    setParts(initialParts(name));
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    const invalidReason = validateNameParts(parts);
    if (invalidReason) {
      setError(invalidReason);
      return;
    }

    startTransition(async () => {
      try {
        await updateName(parts);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {name}
        </h2>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          이름 수정
        </button>
      </div>
    );
  }

  const isComplete = Boolean(
    parts.generation &&
      parts.region &&
      parts.classNo &&
      parts.realName.trim()
  );
  const preview = composeDisplayName(parts);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        <select
          value={parts.generation}
          onChange={(e) => setPart("generation", e.target.value)}
          aria-label="기수"
          className={fieldClass}
        >
          <option value="">기수</option>
          {GENERATIONS.map((g) => (
            <option key={g} value={g}>
              {g}기
            </option>
          ))}
        </select>
        <select
          value={parts.region}
          onChange={(e) => setPart("region", e.target.value)}
          aria-label="지역"
          className={fieldClass}
        >
          <option value="">지역</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={parts.classNo}
          onChange={(e) => setPart("classNo", e.target.value)}
          aria-label="반"
          className={fieldClass}
        >
          <option value="">반</option>
          {CLASS_NUMBERS.map((c) => (
            <option key={c} value={c}>
              {c}반
            </option>
          ))}
        </select>
        <input
          value={parts.realName}
          onChange={(e) => setPart("realName", e.target.value)}
          maxLength={REAL_NAME_MAX_LENGTH}
          placeholder="이름"
          aria-label="이름"
          className={`${fieldClass} w-28`}
        />
      </div>

      {/* 셀렉트가 비어있는 동안에는 "기__반_" 같은 반쪽짜리 미리보기가
          나오므로, 네 칸이 다 찼을 때만 최종 이름을 보여준다. */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {isComplete ? (
          <>
            이렇게 표시됩니다 —{" "}
            <span className="font-medium text-black dark:text-zinc-50">
              {preview}
            </span>
          </>
        ) : (
          "기수 · 지역 · 반을 고르고 이름을 입력하면 최종 이름이 여기 표시됩니다."
        )}
      </p>

      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          취소
        </button>
      </div>
    </div>
  );
}
