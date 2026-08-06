import type { SupabaseClient } from "@supabase/supabase-js";
import { FEEDBACK_TYPES, type FeedbackItem, type FeedbackType } from "@/components/feedback/types";

export const FEEDBACK_PAGE_SIZE = 10;

const FEEDBACK_SELECT =
  "id, user_id, user_name, type, title, content, reply, replied_at, created_at";

type FeedbackRow = {
  id: string;
  user_id: string;
  user_name: string;
  type: FeedbackType;
  title: string;
  content: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
};

function toFeedbackItem(row: FeedbackRow): FeedbackItem {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    type: row.type,
    title: row.title,
    content: row.content,
    reply: row.reply,
    repliedAt: row.replied_at,
    createdAt: row.created_at,
  };
}

export type FeedbackPage = {
  items: FeedbackItem[];
  totalCount: number;
};

export async function fetchOwnFeedbackPage(
  supabase: SupabaseClient,
  userId: string,
  page: number,
  pageSize: number
): Promise<FeedbackPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("feedback")
    .select(FEEDBACK_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    items: ((data ?? []) as FeedbackRow[]).map(toFeedbackItem),
    totalCount: count ?? 0,
  };
}

export async function fetchAllFeedbackPage(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  type: FeedbackType | null
): Promise<FeedbackPage> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("feedback")
    .select(FEEDBACK_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, count } = await query.range(from, to);

  return {
    items: ((data ?? []) as FeedbackRow[]).map(toFeedbackItem),
    totalCount: count ?? 0,
  };
}

export async function fetchFeedbackTypeCounts(
  supabase: SupabaseClient
): Promise<{ total: number; byType: Record<FeedbackType, number> }> {
  const [{ count: total }, ...typeCounts] = await Promise.all([
    supabase.from("feedback").select("*", { count: "exact", head: true }),
    ...FEEDBACK_TYPES.map((type) =>
      supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("type", type)
    ),
  ]);

  const byType = Object.fromEntries(
    FEEDBACK_TYPES.map((type, i) => [type, typeCounts[i].count ?? 0])
  ) as Record<FeedbackType, number>;

  return { total: total ?? 0, byType };
}
