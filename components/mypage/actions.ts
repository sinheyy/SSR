"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMood, type Mood } from "@/components/mypage/moods";

export async function updateMood(mood: Mood) {
  if (!isMood(mood)) {
    throw new Error("잘못된 기분 값입니다");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { error } = await supabase
    .from("users")
    .update({ mood })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/mypage");
}
