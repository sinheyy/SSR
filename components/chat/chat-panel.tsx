"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

const MAX_LENGTH = 500;

export default function ChatPanel({
  user,
}: {
  user: { id: string; name: string };
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("messages")
      .select("id, user_id, user_name, content, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled && data) setMessages([...data].reverse());
      });

    const channel = supabase
      .channel("messages-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload: RealtimePostgresInsertPayload<Message>) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  async function handleSend() {
    const content = input.trim();
    if (!content || content.length > MAX_LENGTH || sending) return;

    setSending(true);
    setError(null);
    const { error } = await supabase.from("messages").insert({
      user_id: user.id,
      user_name: user.name,
      content,
    });
    setSending(false);

    if (error) {
      setError("메시지 전송에 실패했어요");
      return;
    }
    setInput("");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-black/[.08] bg-white shadow-lg dark:border-white/[.145] dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-black/[.08] px-4 py-3 dark:border-white/[.145]">
            <span className="font-semibold text-black dark:text-zinc-50">
              스터디룸 채팅
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-black dark:hover:text-zinc-50"
              aria-label="채팅 닫기"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div key={m.id} className="mb-2 text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {m.user_name}
                </span>
                <span className="ml-2 whitespace-pre-wrap break-words text-zinc-600 dark:text-zinc-400">
                  {m.content}
                </span>
              </div>
            ))}
            <div ref={listEndRef} />
          </div>

          <div className="border-t border-black/[.08] p-3 dark:border-white/[.145]">
            {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                maxLength={MAX_LENGTH}
                placeholder="메시지를 입력하세요"
                className="flex-1 rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm text-black outline-none dark:border-white/[.145] dark:text-zinc-50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-50 dark:text-black"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-2xl text-white shadow-lg dark:bg-zinc-50 dark:text-black"
        aria-label="채팅 토글"
      >
        💬
      </button>
    </div>
  );
}
