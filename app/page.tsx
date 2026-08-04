import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SeatGrid from "@/components/seat/seat-grid";
import type { TableData } from "@/components/seat/types";

type SeatRow = {
  id: string;
  position: number;
  users: { name: string; avatar_url: string | null }[];
};

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  seats: SeatRow[];
};

function toTableData(row: TableRow): TableData {
  return {
    id: row.id,
    name: row.name,
    capacity: row.capacity as 4 | 6,
    seats: row.seats.map((seat) => {
      const occupant = seat.users[0];
      return {
        id: seat.id,
        position: seat.position,
        occupant: occupant
          ? { name: occupant.name, avatarUrl: occupant.avatar_url ?? undefined }
          : null,
      };
    }),
  };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("tables")
    .select("id, name, capacity, seats(id, position, users(name, avatar_url))")
    .order("name")
    .order("position", { referencedTable: "seats" });

  const tables = error ? [] : ((data ?? []) as TableRow[]).map(toTableData);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        스터디룸
      </h1>
      {error ? (
        <p className="text-zinc-600 dark:text-zinc-400">
          좌석 정보를 불러오지 못했습니다.
        </p>
      ) : (
        <SeatGrid tables={tables} />
      )}
    </div>
  );
}
