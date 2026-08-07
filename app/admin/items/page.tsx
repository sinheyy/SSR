import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminItemsPanel from "@/components/admin-items/admin-items-panel";

export default async function AdminItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  const [{ data: items }, { data: users }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, image, unlock_condition, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id, name").order("name"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        아이템 관리
      </h1>
      <AdminItemsPanel items={items ?? []} users={users ?? []} />
    </div>
  );
}
