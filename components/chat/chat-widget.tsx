import { createClient } from "@/lib/supabase/server";
import ChatPanel from "@/components/chat/chat-panel";

export default async function ChatWidget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <ChatPanel
      user={{
        id: user.id,
        name: user.user_metadata?.name ?? user.email ?? user.id,
      }}
    />
  );
}
