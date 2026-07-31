import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserSummary from "@/components/auth/user-summary";
import LogoutButton from "@/components/auth/logout-button";

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-16 dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        마이페이지
      </h1>
      <UserSummary user={user} />
      <LogoutButton />
    </div>
  );
}
