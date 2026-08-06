"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AVATAR_COLORS } from "@/lib/avatar-color";
import DrawingCanvas from "@/components/costume/drawing-canvas";
import CharacterPreview from "@/components/costume/character-preview";
import type { WornItem } from "@/components/costume/types";

type CatalogItem = {
  id: string;
  name: string;
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

  const supabase = useMemo(() => createClient(), []);

  async function handlePickColor(color: string) {
    setAvatarColor(color);
    await supabase
      .from("users")
      .update({ avatar_color: color })
      .eq("id", userId);
  }

  async function persistWornItems(next: WornItem[]) {
    setWornItems(next);
    await supabase.from("users").update({ worn_items: next }).eq("id", userId);
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

  const availableRewardItems = catalogItems.filter(
    (item) =>
      item.unlock_condition === null || unlockedItemIds.includes(item.id)
  );

  const customImages = new Map(items.map((item) => [item.id, item.image]));
  const catalogNames = new Map(
    catalogItems.map((item) => [item.id, item.name])
  );

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
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
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            aria-label="옷장 닫기"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 text-center text-xs text-zinc-500">
            아이템을 드래그해서 위치를 옮겨보세요
          </p>
          <CharacterPreview
            userId={userId}
            avatarColor={avatarColor}
            wornItems={wornItems}
            customImages={customImages}
            catalogNames={catalogNames}
            onMove={handleMove}
          />

          <div className="mt-3 flex justify-center gap-1.5">
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

          <DrawingCanvas onSave={handleSaveDrawing} saving={saving} />

          <div className="my-4 border-t border-black/[.08] dark:border-white/[.145]" />

          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            내 아이템
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
            {availableRewardItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleWorn("catalog", item.id)}
                className={`flex size-14 items-center justify-center rounded-md border-2 p-1 text-center text-[10px] leading-tight ${
                  isWorn("catalog", item.id)
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-black/[.08] dark:border-white/[.145]"
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
          {items.length === 0 && availableRewardItems.length === 0 && (
            <p className="text-sm text-zinc-500">
              아직 보유한 아이템이 없어요
            </p>
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
