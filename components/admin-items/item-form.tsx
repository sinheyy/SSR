"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DrawingCanvas from "@/components/costume/drawing-canvas";
import SegmentedControl from "@/components/admin-items/segmented-control";

type ConditionType = "streak" | "total_hours";
type Mode = "condition" | "grant";

export type EditableItem = {
  id: string;
  name: string;
  image: string | null;
  unlock_condition: { type: string; value?: number } | null;
};

const CONDITION_LABEL: Record<ConditionType, string> = {
  streak: "연속 출석 며칠에 해금될까요?",
  total_hours: "누적 공부시간 몇 시간에 해금될까요?",
};

export default function ItemForm({
  item,
  users,
  onDone,
}: {
  item: EditableItem | null;
  users: { id: string; name: string }[];
  onDone: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const isEditing = !!item;
  const isManual = item?.unlock_condition?.type === "manual";

  const [image, setImage] = useState<string | null>(item?.image ?? null);
  const [name, setName] = useState(item?.name ?? "");
  const [mode, setMode] = useState<Mode>(isManual ? "grant" : "condition");
  const [conditionType, setConditionType] = useState<ConditionType>(
    item?.unlock_condition?.type === "total_hours" ? "total_hours" : "streak"
  );
  const [conditionValue, setConditionValue] = useState(
    item?.unlock_condition?.value ?? 3
  );
  const [targetUserId, setTargetUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!image && name.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit || !image) return;
    setSaving(true);
    setError(null);

    const unlockCondition =
      mode === "condition"
        ? { type: conditionType, value: conditionValue }
        : { type: "manual" };

    let itemId = item?.id;

    if (isEditing) {
      const { error: updateError } = await supabase
        .from("items")
        .update({ name: name.trim(), image, unlock_condition: unlockCondition })
        .eq("id", item.id);
      if (updateError) {
        setError("아이템 수정에 실패했어요");
        setSaving(false);
        return;
      }
    } else {
      const { data: newItem, error: insertError } = await supabase
        .from("items")
        .insert({ name: name.trim(), image, unlock_condition: unlockCondition })
        .select("id")
        .single();
      if (insertError || !newItem) {
        setError("아이템 생성에 실패했어요");
        setSaving(false);
        return;
      }
      itemId = newItem.id;
    }

    if (mode === "grant" && targetUserId && itemId) {
      const { error: grantError } = await supabase.rpc("grant_item", {
        target_user_id: targetUserId,
        target_item_id: itemId,
      });
      if (grantError) {
        setError("저장은 됐지만 지급에 실패했어요");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
          {isEditing ? "아이템 수정" : "새 아이템 그리기"}
        </h2>
        {isEditing && (
          <button
            onClick={onDone}
            className="text-xs text-zinc-500 hover:text-black dark:hover:text-zinc-50"
          >
            취소
          </button>
        )}
      </div>

      {image ? (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="그린 아이템" className="size-24 object-contain" />
          <button
            onClick={() => setImage(null)}
            className="rounded-md border border-black/[.08] px-3 py-1 text-xs text-zinc-600 hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            다시 그리기
          </button>
        </div>
      ) : (
        <DrawingCanvas onSave={setImage} saving={false} />
      )}

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        이름
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 전설의 도서관장 모자"
          className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
        />
      </label>

      <SegmentedControl
        value={mode}
        onChange={setMode}
        options={[
          { value: "condition", label: "조건 달성형" },
          { value: "grant", label: "특정 유저 지급" },
        ]}
      />

      {mode === "condition" ? (
        <div className="flex flex-col gap-2">
          <SegmentedControl
            value={conditionType}
            onChange={setConditionType}
            options={[
              { value: "streak", label: "연속 출석일" },
              { value: "total_hours", label: "누적 공부시간" },
            ]}
          />
          <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {CONDITION_LABEL[conditionType]}
            <input
              type="number"
              min={1}
              value={conditionValue}
              onChange={(e) => setConditionValue(Number(e.target.value))}
              className="w-24 rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          누구에게 줄까요? {isEditing && "(선택 안 하면 기존 지급 상태 유지)"}
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
          >
            <option value="">유저 선택</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || saving}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
      >
        {isEditing ? "수정 저장" : "아이템 만들기"}
      </button>
    </div>
  );
}
