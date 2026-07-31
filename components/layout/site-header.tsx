import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/logout-button";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b border-black/[.08] px-8 py-4 dark:border-white/[.145]">
      <Link href="/" className="font-semibold text-black dark:text-zinc-50">
        홈
      </Link>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/mypage"
              className="font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              마이페이지
            </Link>
            <LogoutButton />
          </>
        ) : (
          <Link
            href="/login"
            className="font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}
