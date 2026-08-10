"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_COLORS } from "@/lib/avatar-color";
import DrawingCanvas from "@/components/costume/drawing-canvas";
import CharacterPreview from "@/components/costume/character-preview";
import SegmentedControl from "@/components/admin-items/segmented-control";
import type { WornItem } from "@/components/costume/types";

type ItemTab = "custom" | "reward";

type CatalogItem = {
  id: string;
  name: string;
  image: string | null;
  unlock_condition: unknown;
};

type CustomItem = {
  id: string;
  image: string;
  created_at: string;
};

export default function CostumeDrawer({
  userId,
  unlockedItemIds,
  wornItems: initialWornItems,
  avatarColor: initialAvatarColor,
  catalogItems,
  customItems,
}: {
  userId: string;
  unlockedItemIds: string[];
  wornItems: WornItem[];
  avatarColor: string | null;
  catalogItems: CatalogItem[];
  customItems: CustomItem[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(customItems);
  const [wornItems, setWornItems] = useState(initialWornItems);
  const [avatarColor, setAvatarColor] = useState(initialAvatarColor);
  const [saving, setSaving] = useState(false);
  const [itemTab, setItemTab] = useState<ItemTab>("custom");

  const supabase = useMemo(() => createClient(), []);

  // 옷장 안에서 배치/크기/회전/색을 바꿀 때마다 바로 DB에 쓰면, users
  // 테이블 UPDATE를 구독 중인 좌석 화면 전체가 매번 재조회를 돌게 되어
  // 부하가 커진다. 그래서 로컬 state만 바로 갱신하고, 실제 저장은 옷장을
  // 닫는 시점에 한 번만 한다. 탭을 그냥 닫아버리면 그동안 바뀐 건 저장 안
  // 되고 날아가지만(=허용된 트레이드오프), 닫기 버튼/바깥 클릭으로 닫는
  // 일반적인 흐름에서는 문제없다.
  const initialRef = useRef({ wornItems: initialWornItems, avatarColor: initialAvatarColor });

  function handlePickColor(color: string) {
    setAvatarColor(color);
  }

  function persistWornItems(next: WornItem[]) {
    setWornItems(next);
  }

  async function flushIfChanged() {
    const initial = initialRef.current;
    const changed =
      avatarColor !== initial.avatarColor ||
      JSON.stringify(wornItems) !== JSON.stringify(initial.wornItems);
    if (!changed) return;

    await supabase
      .from("users")
      .update({ worn_items: wornItems, avatar_color: avatarColor })
      .eq("id", userId);
    initialRef.current = { wornItems, avatarColor };
  }

  function handleClose() {
    setOpen(false);
    flushIfChanged();
  }

  async function handleSaveDrawing(dataUrl: string) {
    setSaving(true);
    const { data, error } = await supabase
      .from("custom_items")
      .insert({ owner_id: userId, image: dataUrl })
      .select("id, image, created_at")
      .single();

    if (!error && data) {
      setItems((prev) => [data, ...prev]);
    }
    setSaving(false);
  }

  function isWorn(source: WornItem["source"], itemId: string) {
    return wornItems.some(
      (worn) => worn.source === source && worn.item_id === itemId
    );
  }

  function toggleWorn(source: WornItem["source"], itemId: string) {
    if (isWorn(source, itemId)) {
      persistWornItems(
        wornItems.filter(
          (worn) => !(worn.source === source && worn.item_id === itemId)
        )
      );
    } else {
      persistWornItems([
        ...wornItems,
        { source, item_id: itemId, x: 50, y: 25 },
      ]);
    }
  }

  async function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    if (isWorn("custom", itemId)) {
      persistWornItems(
        wornItems.filter(
          (worn) => !(worn.source === "custom" && worn.item_id === itemId)
        )
      );
    }
    await supabase.from("custom_items").delete().eq("id", itemId);
  }

  function handleMove(index: number, x: number, y: number) {
    const next = wornItems.map((worn, i) =>
      i === index ? { ...worn, x, y } : worn
    );
    persistWornItems(next);
  }

  function handleTransform(index: number, scale: number, rotation: number) {
    const next = wornItems.map((worn, i) =>
      i === index ? { ...worn, scale, rotation } : worn
    );
    persistWornItems(next);
  }

  const availableRewardItems = catalogItems.filter(
    (item) =>
      item.unlock_condition === null || unlockedItemIds.includes(item.id)
  );

  const itemImages = new Map<string, string>([
    ...items.map((item) => [item.id, item.image] as const),
    ...catalogItems
      .filter((item) => item.image)
      .map((item) => [item.id, item.image as string] as const),
  ]);
  const catalogNames = new Map(
    catalogItems.map((item) => [item.id, item.name])
  );

  return (
    <>
      {open && (
        <div
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-black/30"
          aria-hidden
        />
      )}

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-black/[.08] bg-white shadow-xl transition-transform duration-300 dark:border-white/[.145] dark:bg-zinc-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
          <span className="font-semibold text-black dark:text-zinc-50">
            옷장
          </span>
          <button
            onClick={handleClose}
            className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            aria-label="옷장 닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            내 캐릭터
          </p>
          <p className="mb-2 text-center text-xs text-zinc-500">
            드래그로 위치 이동, 클릭 후 모서리로 크기·위쪽 손잡이로 회전
          </p>
          <CharacterPreview
            userId={userId}
            avatarColor={avatarColor}
            wornItems={wornItems}
            itemImages={itemImages}
            catalogNames={catalogNames}
            onMove={handleMove}
            onTransform={handleTransform}
          />

          <p className="mb-1.5 mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            캐릭터 색
          </p>
          <div className="mx-auto grid w-fit grid-cols-5 gap-1.5">
            {AVATAR_COLORS.map((color) => {
              const swatchClass = color.split(" ")[0]; // 라이트모드 배경색만 스와치로 표시
              return (
                <button
                  key={color}
                  onClick={() => handlePickColor(color)}
                  aria-label={`캐릭터 색 ${swatchClass}`}
                  className={`size-6 rounded-full border border-black/[.15] dark:border-white/[.2] ${swatchClass} ${
                    avatarColor === color
                      ? "ring-2 ring-offset-1 ring-black dark:ring-white"
                      : ""
                  }`}
                />
              );
            })}
          </div>

          <div className="my-4 border-t border-black/[.08] dark:border-white/[.145]" />

          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            아이템 그리기
          </p>
          <DrawingCanvas onSave={handleSaveDrawing} saving={saving} />

          <div className="my-4 border-t border-black/[.08] dark:border-white/[.145]" />

          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              아이템
            </p>
            <SegmentedControl
              value={itemTab}
              onChange={setItemTab}
              options={[
                { value: "custom", label: "내 아이템" },
                { value: "reward", label: "보상 아이템" },
              ]}
            />
          </div>

          {itemTab === "custom" ? (
            <>
              <p className="mb-2 text-xs text-zinc-500">
                눌러서 착용/해제 · 그린 아이템은 ✕로 삭제
              </p>
              <div className="grid grid-cols-4 gap-2">
                {items.map((item) => (
                  <div key={item.id} className="relative">
                    <button
                      onClick={() => toggleWorn("custom", item.id)}
                      className={`size-14 overflow-hidden rounded-md border-2 ${
                        isWorn("custom", item.id)
                          ? "border-emerald-500"
                          : "border-black/[.08] dark:border-white/[.145]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.image}
                        alt="내가 그린 아이템"
                        className="size-full object-contain"
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      aria-label="아이템 삭제"
                      className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-zinc-700 text-[9px] text-white hover:bg-red-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              {items.length === 0 && (
                <p className="text-sm text-zinc-500">
                  아직 그린 아이템이 없어요
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mb-2 text-xs text-zinc-500">
                눌러서 착용/해제
              </p>
              <div className="grid grid-cols-4 gap-2">
                {availableRewardItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleWorn("catalog", item.id)}
                    title={item.name}
                    className={`flex size-14 items-center justify-center overflow-hidden rounded-md border-2 p-1 text-center text-[10px] leading-tight ${
                      isWorn("catalog", item.id)
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                        : "border-black/[.08] dark:border-white/[.145]"
                    }`}
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="size-full object-contain" />
                    ) : (
                      item.name
                    )}
                  </button>
                ))}
              </div>
              {availableRewardItems.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-500">
                  ✨ 숨겨진 미션을 달성해서
                  <br />
                  특별한 아이템을 받아보세요!
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white shadow-lg dark:bg-zinc-50 dark:text-black"
          aria-label="옷장 열기"
        >
          🎨
        </button>
      )}
    </>
  );
}
