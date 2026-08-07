"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import WhiteboardModal from "@/components/whiteboard/whiteboard-modal";

export default function WhiteboardIcon() {
  const [open, setOpen] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase
      .from("whiteboard")
      .select("image")
      .eq("id", "main")
      .single()
      .then(({ data }) => setThumbnail(data?.image ?? null));

    const channel = supabase
      .channel("whiteboard-thumbnail")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "whiteboard" },
        (payload) => {
          setThumbnail((payload.new as { image: string | null }).image);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      {open && <WhiteboardModal onClose={() => setOpen(false)} />}
    </>
  );
}
