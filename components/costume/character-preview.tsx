"use client";

import { useRef, useState } from "react";
import { colorForUser } from "@/lib/avatar-color";
import type { WornItem } from "@/components/costume/types";

export default function CharacterPreview({
  userId,
  wornItems,
  customImages,
  catalogNames,
  onMove,
}: {
  userId: string;
  wornItems: WornItem[];
  customImages: Map<string, string>;
  catalogNames: Map<string, string>;
  onMove: (index: number, x: number, y: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  function clampPercent(value: number) {
    return Math.min(100, Math.max(0, value));
  }

  function posFromEvent(e: React.PointerEvent) {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  }

  function handlePointerDown(index: number, e: React.PointerEvent) {
    e.stopPropagation();
    e.preventDefault();
    const pointer = posFromEvent(e);
    const worn = wornItems[index];
    dragOffset.current = { dx: worn.x - pointer.x, dy: worn.y - pointer.y };
    setDraggingIndex(index);
    setDragPos({ x: worn.x, y: worn.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingIndex === null) return;
    const pointer = posFromEvent(e);
    setDragPos({
      x: clampPercent(pointer.x + dragOffset.current.dx),
      y: clampPercent(pointer.y + dragOffset.current.dy),
    });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (draggingIndex === null) return;
    const pointer = posFromEvent(e);
    const x = clampPercent(pointer.x + dragOffset.current.dx);
    const y = clampPercent(pointer.y + dragOffset.current.dy);
    onMove(draggingIndex, x, y);
    setDraggingIndex(null);
    setDragPos(null);
  }

  return (
    <div
      ref={boxRef}
      className={`relative mx-auto size-40 rounded-md ${colorForUser(userId)}`}
    >
      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-6">
        <span className="size-6 rounded-full bg-black/50" />
        <span className="size-6 rounded-full bg-black/50" />
      </span>

      {wornItems.map((worn, index) => {
        const pos = draggingIndex === index && dragPos ? dragPos : worn;
        const image =
          worn.source === "custom" ? customImages.get(worn.item_id) : null;

        return (
          <div
            key={`${worn.source}-${worn.item_id}`}
            onPointerDown={(e) => handlePointerDown(index, e)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className={`absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing ${
              image ? "size-[91px]" : ""
            }`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                draggable={false}
                className="size-full object-contain"
              />
            ) : (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black shadow dark:bg-zinc-900/90 dark:text-zinc-50">
                {catalogNames.get(worn.item_id) ?? "아이템"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
