"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_TYPES, type FeedbackType } from "@/components/feedback/types";

function assertValidType(type: string): asserts type is FeedbackType {
  if (!(FEEDBACK_TYPES as readonly string[]).includes(type)) {
    throw new Error("잘못된 문의 유형입니다");
  }
}

export async function submitFeedback(
  type: FeedbackType,
  title: string,
  content: string
) {
  assertValidType(type);
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) {
    throw new Error("제목과 내용을 입력해주세요");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .single();

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    user_name:
      profile?.name ?? user.user_metadata?.name ?? user.email ?? user.id,
    type,
    title: trimmedTitle,
    content: trimmedContent,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feedback");
}

export async function updateFeedback(
  id: string,
  type: FeedbackType,
  title: string,
  content: string
) {
  assertValidType(type);
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  if (!trimmedTitle || !trimmedContent) {
    throw new Error("제목과 내용을 입력해주세요");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ type, title: trimmedTitle, content: trimmedContent })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feedback");
}

export async function deleteFeedback(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/feedback");
}

export async function replyToFeedback(id: string, reply: string) {
  const trimmedReply = reply.trim();
  if (!trimmedReply) {
    throw new Error("답변 내용을 입력해주세요");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ reply: trimmedReply, replied_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/feedback");
  revalidatePath("/feedback");
}
