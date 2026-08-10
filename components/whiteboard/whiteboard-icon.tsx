"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WhiteboardModal from "@/components/whiteboard/whiteboard-modal";

// 이 아이콘은 로그인한 모든 유저 화면에 항상 떠 있어서, realtime으로
// 구독하면 누구 한 명이 그릴 때마다 접속자 전원이 큰 이미지를 받아
// 디코드해야 해서 부하가 크다. 모달을 직접 열어서 보는 사람은 여전히
// 실시간이니(whiteboard-modal.tsx), 아이콘 미리보기는 폴링으로 늦게
// 반영되는 걸 감수한다.
const POLL_MS = 30_000;

export default function WhiteboardIcon() {
  const [open, setOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  function refresh() {
    supabase
      .from("whiteboard")
      .select("image")
      .eq("id", "main")
      .single()
      .then(({ data }) => setThumbnail(data?.image ?? null));
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-sm border-4 border-[#8a6448] bg-white text-2xl shadow-sm transition hover:brightness-105 dark:border-[#5a4a34] dark:bg-zinc-100"
        aria-label="화이트보드 열기"
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="화이트보드" className="size-full object-contain" />
        ) : (
          "📋"
        )}
      </button>
      {open && (
        <WhiteboardModal
          onClose={() => {
            setOpen(false);
            refresh();
          }}
        />
      )}
    </>
  );
}
