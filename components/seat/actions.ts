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
