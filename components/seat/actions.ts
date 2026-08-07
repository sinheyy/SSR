"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sitAtSeat(seatId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sit_at_seat", {
    target_seat_id: seatId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function leaveSeat() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_seat");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

// 평일 09:00~17:50 진입을 클라이언트가 감지했을 때 호출 — 이미 앉아있던
// 사람들을 정산 후 일괄 퇴장시킴. 이미 비어있으면 아무 일도 안 하므로
// 여러 클라이언트가 동시에 불러도 안전합니다.
export async function clearSeatsForExcludedHours() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_seats_for_excluded_hours");

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}

// 다른 클라이언트가 presence leave 이벤트로 이 유저의 연결 종료를
// 감지했을 때 호출 — 브라우저를 그냥 닫아서 본인이 leaveSeat을
// 호출할 기회가 없었던 경우의 자동 퇴장 처리
export async function clearSeatForUser(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_seat_for_user", {
    target_user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}
