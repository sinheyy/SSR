import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_PAGE_SIZE, fetchOwnFeedbackPage } from "@/components/feedback/data";
import FeedbackModal from "@/components/feedback/feedback-modal";
import FeedbackList from "@/components/feedback/feedback-list";
import Pagination from "@/components/feedback/pagination";

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const { items, totalCount } = await fetchOwnFeedbackPage(
    supabase,
    user.id,
    page,
    FEEDBACK_PAGE_SIZE
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / FEEDBACK_PAGE_SIZE));

  return (
    <div className="flex flex-1 flex-col gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          문의하기
        </h1>
        <FeedbackModal />
      </div>
      <FeedbackList items={items} />
      <Pagination
        page={page}
        totalPages={totalPages}
        makeHref={(p) => `/feedback?page=${p}`}
      />
    </div>
  );
}