"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMood, type Mood } from "@/components/mypage/moods";
import {
  composeDisplayName,
  validateNameParts,
  type NameParts,
} from "@/lib/display-name";

// 이름은 랭킹판·좌석·관리자 화면에서 사람을 식별하는 유일한 값이라
// "4기_판교_2반_윤신혜" 형식을 서버에서도 다시 검증한 뒤 조립해서 저장한다.
// (클라이언트 검증만 믿으면 폼을 우회한 요청을 막을 수 없다)
export async function updateName(parts: NameParts) {
  const invalidReason = validateNameParts(parts);
  if (invalidReason) {
    throw new Error(invalidReason);
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
    .update({ name: composeDisplayName(parts) })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  // 이름은 마이페이지 말고 좌석/랭킹에도 나오므로 메인도 같이 갱신한다.
  // (다른 접속자 화면은 users UPDATE realtime 구독으로 알아서 반영된다)
  revalidatePath("/mypage");
  revalidatePath("/");
}

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

export async function updateMoodVisibility(showMood: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("로그인이 필요합니다");
  }

  const { error } = await supabase
    .from("users")
    .update({ show_mood: showMood })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/mypage");
}
