"use client";

import { useRef, useState } from "react";
import { colorForUser } from "@/lib/avatar-color";
import type { WornItem } from "@/components/costume/types";

const CLICK_THRESHOLD = 3; // 이보다 적게 움직이면 드래그가 아니라 클릭(선택)으로 간주
const BASE_SIZE = 91; // 스케일 1일 때 아이템 한 변 길이(px)
const IDLE_HANDLE_DIST = (BASE_SIZE / 2) * Math.SQRT2; // 중심~모서리 핸들 거리(스케일 1 기준)

function clampScale(value: number) {
  return Math.min(3, Math.max(0.3, value));
}

export default function CharacterPreview({
  userId,
  avatarColor,
  wornItems,
  itemImages,
  catalogNames,
  onMove,
  onTransform,
}: {
  userId: string;
  avatarColor: string | null;
  wornItems: WornItem[];
  itemImages: Map<string, string>;
  catalogNames: Map<string, string>;
  onMove: (index: number, x: number, y: number) => void;
  onTransform: (index: number, scale: number, rotation: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const movedRef = useRef(false);
  const transformRef = useRef<{
    index: number;
    mode: "resize" | "rotate";
    centerX: number;
    centerY: number;
  } | null>(null);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [transformIndex, setTransformIndex] = useState<number | null>(null);
  const [transformDraft, setTransformDraft] = useState<{
    scale: number;
    rotation: number;
  } | null>(null);

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
    movedRef.current = false;
    setDraggingIndex(index);
    setDragPos({ x: worn.x, y: worn.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (draggingIndex === null) return;
    const pointer = posFromEvent(e);
    const x = clampPercent(pointer.x + dragOffset.current.dx);
    const y = clampPercent(pointer.y + dragOffset.current.dy);
    if (
      Math.abs(x - wornItems[draggingIndex].x) > CLICK_THRESHOLD ||
      Math.abs(y - wornItems[draggingIndex].y) > CLICK_THRESHOLD
    ) {
      movedRef.current = true;
    }
    setDragPos({ x, y });
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (draggingIndex === null) return;
    if (movedRef.current) {
      const pointer = posFromEvent(e);
      const x = clampPercent(pointer.x + dragOffset.current.dx);
      const y = clampPercent(pointer.y + dragOffset.current.dy);
      onMove(draggingIndex, x, y);
    } else {
      setSelectedIndex((prev) => (prev === draggingIndex ? null : draggingIndex));
    }
    setDraggingIndex(null);
    setDragPos(null);
  }

  function startTransform(
    index: number,
    mode: "resize" | "rotate",
    e: React.PointerEvent
  ) {
    e.stopPropagation();
    e.preventDefault();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worn = wornItems[index];
    transformRef.current = {
      index,
      mode,
      centerX: rect.left + (worn.x / 100) * rect.width,
      centerY: rect.top + (worn.y / 100) * rect.height,
    };
    setTransformIndex(index);
    setTransformDraft({ scale: worn.scale ?? 1, rotation: worn.rotation ?? 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handleTransformMove(e: React.PointerEvent) {
    const t = transformRef.current;
    if (!t) return;
    const dx = e.clientX - t.centerX;
    const dy = e.clientY - t.centerY;
    if (t.mode === "resize") {
      const scale = clampScale(Math.hypot(dx, dy) / IDLE_HANDLE_DIST);
      setTransformDraft((prev) => ({ scale, rotation: prev?.rotation ?? 0 }));
    } else {
      const rotation = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      setTransformDraft((prev) => ({ scale: prev?.scale ?? 1, rotation }));
    }
  }

  function handleTransformUp() {
    const t = transformRef.current;
    if (!t || !transformDraft) return;
    onTransform(t.index, transformDraft.scale, transformDraft.rotation);
    transformRef.current = null;
    setTransformIndex(null);
    setTransformDraft(null);
  }

  return (
    <div
      ref={boxRef}
      onClick={() => setSelectedIndex(null)}
      className={`relative mx-auto size-40 rounded-md ${colorForUser(userId, avatarColor)}`}
    >
      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-6">
        <span className="size-6 rounded-full bg-black/50" />
        <span className="size-6 rounded-full bg-black/50" />
      </span>

      {wornItems.map((worn, index) => {
        const pos = draggingIndex === index && dragPos ? dragPos : worn;
        const image = itemImages.get(worn.item_id);
        const isTransforming = transformIndex === index && transformDraft;
        const scale = isTransforming ? transformDraft.scale : worn.scale ?? 1;
        const rotation = isTransforming ? transformDraft.rotation : worn.rotation ?? 0;
        const isSelected = selectedIndex === index;

        return (
          <div
            key={`${worn.source}-${worn.item_id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <div
              onPointerDown={(e) => handlePointerDown(index, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={(e) => e.stopPropagation()}
              className={`relative flex cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing ${
                isSelected ? "outline outline-2 outline-dashed outline-emerald-500" : ""
              }`}
              style={
                image
                  ? {
                      width: BASE_SIZE * scale,
                      height: BASE_SIZE * scale,
                      transform: `rotate(${rotation}deg)`,
                    }
                  : { transform: `rotate(${rotation}deg) scale(${scale})` }
              }
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" draggable={false} className="size-full object-contain" />
              ) : (
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-black shadow dark:bg-zinc-900/90 dark:text-zinc-50">
                  {catalogNames.get(worn.item_id) ?? "아이템"}
                </span>
              )}

              {isSelected && image && (
                <>
                  <div
                    onPointerDown={(e) => startTransform(index, "resize", e)}
                    onPointerMove={handleTransformMove}
                    onPointerUp={handleTransformUp}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="크기 조절"
                    className="absolute bottom-0 right-0 size-3 translate-x-1/2 translate-y-1/2 cursor-nwse-resize rounded-sm border border-white bg-emerald-500"
                  />
                  <div
                    onPointerDown={(e) => startTransform(index, "rotate", e)}
                    onPointerMove={handleTransformMove}
                    onPointerUp={handleTransformUp}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="회전"
                    className="absolute left-1/2 top-0 size-3 -translate-x-1/2 cursor-grab rounded-full border border-white bg-emerald-500"
                    style={{ transform: "translate(-50%, calc(-100% - 10px))" }}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
