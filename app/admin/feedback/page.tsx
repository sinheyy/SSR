import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FEEDBACK_PAGE_SIZE,
  fetchAllFeedbackPage,
  fetchFeedbackTypeCounts,
} from "@/components/feedback/data";
import { isFeedbackType } from "@/components/feedback/types";
import AdminFeedbackList from "@/components/feedback/admin-feedback-list";
import Pagination from "@/components/feedback/pagination";
import TypeFilterTabs from "@/components/feedback/type-filter-tabs";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
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

  const { page: pageParam, type: typeParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const activeType = typeParam && isFeedbackType(typeParam) ? typeParam : null;

  const [{ items, totalCount }, counts] = await Promise.all([
    fetchAllFeedbackPage(supabase, page, FEEDBACK_PAGE_SIZE, activeType),
    fetchFeedbackTypeCounts(supabase),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / FEEDBACK_PAGE_SIZE));

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        문의 관리
      </h1>
      <TypeFilterTabs
        activeType={activeType}
        total={counts.total}
        byType={counts.byType}
      />
      <AdminFeedbackList items={items} />
      <Pagination
        page={page}
        totalPages={totalPages}
        makeHref={(p) =>
          activeType
            ? `/admin/feedback?type=${encodeURIComponent(activeType)}&page=${p}`
            : `/admin/feedback?page=${p}`
        }
      />
    </div>
  );
}