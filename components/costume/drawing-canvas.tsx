"use client";

import { useRef, useState } from "react";
import { DRAW_COLORS } from "@/lib/draw-colors";

const SIZE = 96;
const BRUSH_SIZE = 4;

export default function DrawingCanvas({
  onSave,
  saving,
}: {
  onSave: (dataUrl: string) => void;
  saving: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(DRAW_COLORS[0]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pos = getPos(e);
    if (cursorRef.current) {
      cursorRef.current.style.display = "block";
      cursorRef.current.style.left = `${pos.x}px`;
      cursorRef.current.style.top = `${pos.y}px`;
    }

    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = BRUSH_SIZE;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            handlePointerUp();
            if (cursorRef.current) cursorRef.current.style.display = "none";
          }}
          className="touch-none rounded-md border border-black/[.08] bg-white dark:border-white/[.145]"
          style={{
            // 캔버스는 실제로 투명이라(흰색으로 칠한 부분만 불투명하게
            // 저장됨), 배경을 단색으로 고정하면 그 색을 칠할 때 또 안
            // 보이는 문제가 반복된다. 대신 체크무늬로 "투명"을 표시해서
            // 어떤 색을 칠해도 항상 구분되게 함 (저장되는 이미지엔 영향 없음).
            backgroundImage:
              "linear-gradient(45deg, #d1d5db 25%, transparent 25%), linear-gradient(-45deg, #d1d5db 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d1d5db 75%), linear-gradient(-45deg, transparent 75%, #d1d5db 75%)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
          }}
        />
        <div
          ref={cursorRef}
          className="pointer-events-none absolute rounded-full border-2 shadow-[0_0_0_1px_white]"
          style={{
            display: "none",
            width: BRUSH_SIZE,
            height: BRUSH_SIZE,
            borderColor: color,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
      <div className="grid w-fit grid-cols-7 gap-1">
        {DRAW_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`색상 ${c}`}
            className={`size-5 rounded-full border border-black/[.15] dark:border-white/[.2] ${
              color === c ? "ring-2 ring-offset-1 ring-black dark:ring-white" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleClear}
          className="rounded-md border border-black/[.08] px-3 py-1 text-xs text-zinc-600 hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          지우기
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-black px-3 py-1 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
        >
          저장
        </button>
      </div>
    </div>
  );
}
