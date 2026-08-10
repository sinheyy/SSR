import type { SupabaseClient } from "@supabase/supabase-js";
import type { WornItem } from "@/components/costume/types";
import type { TableData } from "@/components/seat/types";

const TABLES_SELECT =
  "id, name, capacity, seats(id, position, user_id, status_changed_at, users(name, avatar_url, mood, show_mood, avatar_color, worn_items))";

type SeatRow = {
  id: string;
  position: number;
  user_id: string | null;
  status_changed_at: string | null;
  users: {
    name: string;
    avatar_url: string | null;
    mood: string | null;
    show_mood: boolean | null;
    avatar_color: string | null;
    worn_items: WornItem[] | null;
  } | null;
};

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  seats: SeatRow[];
};

function toTableData(
  row: TableRow,
  itemImages: Map<string, string>
): TableData {
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
                mood: occupant.mood,
                showMood: occupant.show_mood ?? true,
                avatarColor: occupant.avatar_color,
                customItems: (occupant.worn_items ?? [])
                  .map((worn) => ({
                    image: itemImages.get(worn.item_id) ?? "",
                    x: worn.x,
                    y: worn.y,
                  }))
                  .filter((item) => item.image),
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

  const rows = (data ?? []) as unknown as TableRow[];
  const wornItems = rows
    .flatMap((row) => row.seats)
    .flatMap((seat) => seat.users?.worn_items ?? []);

  const customItemIds = [
    ...new Set(
      wornItems
        .filter((worn) => worn.source === "custom")
        .map((worn) => worn.item_id)
    ),
  ];
  const catalogItemIds = [
    ...new Set(
      wornItems
        .filter((worn) => worn.source === "catalog")
        .map((worn) => worn.item_id)
    ),
  ];

  // custom(직접 그린 것)과 catalog(스트릭 해금/관리자 지급 명예형) 두 소스의
  // 이미지를 하나의 맵으로 합쳐야 착용 중인 아이템이 소스에 상관없이 다 보임
  const itemImages = new Map<string, string>();
  if (customItemIds.length > 0) {
    const { data: customItems } = await supabase
      .from("custom_items")
      .select("id, image")
      .in("id", customItemIds);
    for (const item of customItems ?? []) {
      itemImages.set(item.id, item.image);
    }
  }
  if (catalogItemIds.length > 0) {
    const { data: catalogItems } = await supabase
      .from("items")
      .select("id, image")
      .in("id", catalogItemIds);
    for (const item of catalogItems ?? []) {
      if (item.image) itemImages.set(item.id, item.image);
    }
  }

  return {
    tables: rows.map((row) => toTableData(row, itemImages)),
    error: false,
  };
}
