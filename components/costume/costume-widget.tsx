import { createClient } from "@/lib/supabase/server";
import CostumeDrawer from "@/components/costume/costume-drawer";
import type { WornItem } from "@/components/costume/types";

export default async function CostumeWidget() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: catalogItems }, { data: customItems }] =
    await Promise.all([
      supabase
        .from("users")
        .select("unlocked_items, worn_items")
        .eq("id", user.id)
        .single(),
      supabase.from("items").select("id, name, unlock_condition"),
      supabase
        .from("custom_items")
        .select("id, image, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <CostumeDrawer
      userId={user.id}
      unlockedItemIds={profile?.unlocked_items ?? []}
      wornItems={(profile?.worn_items as WornItem[] | null) ?? []}
      catalogItems={catalogItems ?? []}
      customItems={customItems ?? []}
    />
  );
}
