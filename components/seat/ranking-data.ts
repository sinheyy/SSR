import type { SupabaseClient } from "@supabase/supabase-js";
import type { WornItem } from "@/components/costume/types";

export type RankingEntry = {
  userId: string;
  name: string;
  value: number;
  avatarColor: string | null;
  customItems: { image: string; x: number; y: number; scale: number; rotation: number }[];
};

export type Rankings = {
  byTime: RankingEntry[];
  byStreak: RankingEntry[];
};

type TimeRow = {
  id: string;
  name: string;
  total_study_seconds: number | null;
  avatar_color: string | null;
  worn_items: WornItem[] | null;
};

type StreakRow = {
  id: string;
  name: string;
  streak_days: number | null;
  avatar_color: string | null;
  worn_items: WornItem[] | null;
};

function toCustomItems(
  wornItems: WornItem[] | null,
  images: Map<string, string>
) {
  return (wornItems ?? [])
    .map((worn) => ({
      image: images.get(worn.item_id) ?? "",
      x: worn.x,
      y: worn.y,
      scale: worn.scale ?? 1,
      rotation: worn.rotation ?? 0,
    }))
    .filter((item) => item.image);
}

export async function fetchRankings(
  supabase: SupabaseClient
): Promise<Rankings> {
  const [{ data: byTime }, { data: byStreak }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, total_study_seconds, avatar_color, worn_items")
      .not("slack_user_id", "is", null)
      .order("total_study_seconds", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("id, name, streak_days, avatar_color, worn_items")
      .not("slack_user_id", "is", null)
      .order("streak_days", { ascending: false })
      .limit(10),
  ]);

  const byTimeRows = (byTime ?? []) as unknown as TimeRow[];
  const byStreakRows = (byStreak ?? []) as unknown as StreakRow[];

  const wornItems = [...byTimeRows, ...byStreakRows].flatMap(
    (row) => row.worn_items ?? []
  );
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
  const customItemImages = new Map<string, string>();
  if (customItemIds.length > 0) {
    const { data: customItems } = await supabase
      .from("custom_items")
      .select("id, image")
      .in("id", customItemIds);
    for (const item of customItems ?? []) {
      customItemImages.set(item.id, item.image);
    }
  }
  if (catalogItemIds.length > 0) {
    const { data: catalogItems } = await supabase
      .from("items")
      .select("id, image")
      .in("id", catalogItemIds);
    for (const item of catalogItems ?? []) {
      if (item.image) customItemImages.set(item.id, item.image);
    }
  }

  return {
    byTime: byTimeRows.map((row) => ({
      userId: row.id,
      name: row.name,
      value: row.total_study_seconds ?? 0,
      avatarColor: row.avatar_color,
      customItems: toCustomItems(row.worn_items, customItemImages),
    })),
    byStreak: byStreakRows.map((row) => ({
      userId: row.id,
      name: row.name,
      value: row.streak_days ?? 0,
      avatarColor: row.avatar_color,
      customItems: toCustomItems(row.worn_items, customItemImages),
    })),
  };
}
