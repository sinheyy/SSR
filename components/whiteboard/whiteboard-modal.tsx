"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DRAW_COLORS } from "@/lib/draw-colors";

const WIDTH = 640;
const HEIGHT = 400;
const ERASER_SIZE = 20;

export default function WhiteboardModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [color, setColor] = useState(DRAW_COLORS[0]);
  const [tool, setTool] = useState<"draw" | "erase">("draw");

  const supabase = useMemo(() => createClient(), []);

  function drawImageDataUrl(dataUrl: string) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  useEffect(() => {
    supabase
      .from("whiteboard")
      .select("image")
      .eq("id", "main")
      .single()
      .then(({ data }) => {
        if (data?.image) drawImageDataUrl(data.image);
      });

    const channel = supabase
      .channel("whiteboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whiteboard" },
        (payload) => {
          const image = (payload.new as { image: string | null }).image;
          if (image) drawImageDataUrl(image);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineCap = "round";
    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = ERASER_SIZE;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 4;
      ctx.strokeStyle = color;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  async function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    await saveCanvas();
  }

  async function saveCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await supabase
      .from("whiteboard")
      .update({ image: canvas.toDataURL("image/png"), updated_at: new Date().toISOString() })
      .eq("id", "main");
  }

  async function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await saveCanvas();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 shadow-xl dark:border-white/[.145] dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            📋 화이트보드
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            aria-label="화이트보드 닫기"
          >
            ✕
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="touch-none rounded-md border border-black/[.08] bg-white dark:border-white/[.145]"
        />

        <div className="flex items-center justify-between">
          <div className="grid grid-cols-7 gap-1">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool("draw");
                }}
                aria-label={`색상 ${c}`}
                className={`size-5 rounded-full border border-black/[.15] dark:border-white/[.2] ${
                  tool === "draw" && color === c
                    ? "ring-2 ring-offset-1 ring-black dark:ring-white"
                    : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTool("erase")}
              aria-label="지우개"
              className={`rounded-md border px-3 py-1 text-xs ${
                tool === "erase"
                  ? "border-black bg-zinc-100 text-black dark:border-white dark:bg-zinc-700 dark:text-zinc-50"
                  : "border-black/[.08] text-zinc-600 hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:text-zinc-50"
              }`}
            >
              지우개
            </button>
            <button
              onClick={handleClear}
              className="rounded-md border border-black/[.08] px-3 py-1 text-xs text-zinc-600 hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              전체 지우기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
