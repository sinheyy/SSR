import type { SupabaseClient } from "@supabase/supabase-js";
import type { WornItem } from "@/components/costume/types";

export type RankingEntry = {
  userId: string;
  name: string;
  value: number;
  customItems: { image: string; x: number; y: number }[];
};

export type Rankings = {
  byTime: RankingEntry[];
  byStreak: RankingEntry[];
};

type TimeRow = {
  id: string;
  name: string;
  total_study_seconds: number | null;
  worn_items: WornItem[] | null;
};

type StreakRow = {
  id: string;
  name: string;
  streak_days: number | null;
  worn_items: WornItem[] | null;
};

function toCustomItems(
  wornItems: WornItem[] | null,
  images: Map<string, string>
) {
  return (wornItems ?? [])
    .filter((worn) => worn.source === "custom")
    .map((worn) => ({
      image: images.get(worn.item_id) ?? "",
      x: worn.x,
      y: worn.y,
    }))
    .filter((item) => item.image);
}

export async function fetchRankings(
  supabase: SupabaseClient
): Promise<Rankings> {
  const [{ data: byTime }, { data: byStreak }] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, total_study_seconds, worn_items")
      .order("total_study_seconds", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("id, name, streak_days, worn_items")
      .order("streak_days", { ascending: false })
      .limit(10),
  ]);

  const byTimeRows = (byTime ?? []) as unknown as TimeRow[];
  const byStreakRows = (byStreak ?? []) as unknown as StreakRow[];

  const customItemIds = [
    ...new Set(
      [...byTimeRows, ...byStreakRows]
        .flatMap((row) => row.worn_items ?? [])
        .filter((worn) => worn.source === "custom")
        .map((worn) => worn.item_id)
    ),
  ];

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

  return {
    byTime: byTimeRows.map((row) => ({
      userId: row.id,
      name: row.name,
      value: row.total_study_seconds ?? 0,
      customItems: toCustomItems(row.worn_items, customItemImages),
    })),
    byStreak: byStreakRows.map((row) => ({
      userId: row.id,
      name: row.name,
      value: row.streak_days ?? 0,
      customItems: toCustomItems(row.worn_items, customItemImages),
    })),
  };
}
