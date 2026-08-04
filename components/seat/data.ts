import type { SupabaseClient } from "@supabase/supabase-js";
import type { TableData } from "@/components/seat/types";

const TABLES_SELECT =
  "id, name, capacity, seats(id, position, user_id, status_changed_at, users(name, avatar_url))";

type SeatRow = {
  id: string;
  position: number;
  user_id: string | null;
  status_changed_at: string | null;
  users: { name: string; avatar_url: string | null } | null;
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
      const occupant = seat.users;
      return {
        id: seat.id,
        position: seat.position,
        occupant:
          occupant && seat.user_id
            ? {
                userId: seat.user_id,
                name: occupant.name,
                avatarUrl: occupant.avatar_url ?? undefined,
                sittingSince: seat.status_changed_at ?? new Date().toISOString(),
              }
            : null,
      };
    }),
  };
}

export async function fetchTables(
  supabase: SupabaseClient
): Promise<{ tables: TableData[]; error: boolean }> {
  const { data, error } = await supabase
    .from("tables")
    .select(TABLES_SELECT)
    .order("name")
    .order("position", { referencedTable: "seats" });

  if (error) {
    return { tables: [], error: true };
  }

  return {
    tables: ((data ?? []) as unknown as TableRow[]).map(toTableData),
    error: false,
  };
}
