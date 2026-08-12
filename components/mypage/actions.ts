"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMood, type Mood } from "@/components/mypage/moods";
import {
  composeDisplayName,
  validateNameParts,
  type NameParts,
} from "@/lib/display-name";

// 이름 저장은 "예상 가능한 실패"(형식 오류, 중복)가 정상 흐름의 일부라
// throw가 아니라 반환값으로 돌려준다. Server Function에서 throw한 에러는
// 프로덕션 빌드에서 메시지가 지워지고 일반 문구로 대체되기 때문에, 사용자는
// "기수를 골라주세요" 대신 알 수 없는 영문 메시지를 보게 된다.
// (node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md)
export type UpdateNameResult =
  | { ok: true }
  | { ok: false; message: string; suggestion?: string };

// 이미 쓰이는 이름이면 뒤에 숫자를 붙여 비어있는 이름을 찾아준다.
// (4기_판교_2반_윤신혜 -> 4기_판교_2반_윤신혜2)
function suggestAvailableName(base: string, taken: Set<string>) {
  for (let n = 2; n <= 99; n += 1) {
    const candidate = `${base}${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  return undefined;
}

// 이름은 랭킹판·좌석·관리자 화면에서 사람을 식별하는 유일한 값이라
// "4기_판교_2반_윤신혜" 형식을 서버에서도 다시 검증한 뒤 조립해서 저장한다.
// (클라이언트 검증만 믿으면 폼을 우회한 요청을 막을 수 없다)
export async function updateName(
  parts: NameParts
): Promise<UpdateNameResult> {
  const invalidReason = validateNameParts(parts);
  if (invalidReason) {
    return { ok: false, message: invalidReason };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const nextName = composeDisplayName(parts);

  // 같은 이름을 쓰는 사람이 있으면 랭킹/좌석에서 누가 누군지 알 수 없다.
  // 이름에 "_"가 들어가는데 LIKE에서는 "_"가 한 글자 와일드카드라 패턴으로
  // 좁히면 엉뚱한 행이 걸린다. 인원이 많지 않으니 전체를 읽어와서 비교한다.
  const { data: others, error: lookupError } = await supabase
    .from("users")
    .select("name")
    .neq("id", user.id);

  if (lookupError) {
    return { ok: false, message: lookupError.message };
  }

  const taken = new Set((others ?? []).map((row) => row.name));
  if (taken.has(nextName)) {
    return {
      ok: false,
      message: "이미 같은 이름을 쓰는 사람이 있어요.",
      suggestion: suggestAvailableName(nextName, taken),
    };
  }

  // .select()를 붙여야 실제로 갱신된 행을 확인할 수 있다. 붙이지 않으면
  // 조건에 맞는 행이 하나도 없어도 error가 null이라 저장된 것처럼 보인다.
  const { data: updated, error } = await supabase
    .from("users")
    .update({ name: nextName })
    .eq("id", user.id)
    .select("id");

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!updated || updated.length === 0) {
    return {
      ok: false,
      message: "프로필을 찾지 못했어요. 다시 로그인한 뒤 시도해주세요.",
    };
  }

  // 이름은 마이페이지 말고 좌석/랭킹에도 나오므로 메인도 같이 갱신한다.
  // (다른 접속자 화면은 users UPDATE realtime 구독으로 알아서 반영된다)
  revalidatePath("/mypage");
  revalidatePath("/");
  return { ok: true };
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
