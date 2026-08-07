import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/auth/logout-button";

export default async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <header className="flex items-center justify-between border-b border-black/[.08] px-8 py-4 dark:border-white/[.145]">
      <Link href="/" className="relative h-14 w-52">
        <Image
          src="/assets/logo-v2.png"
          alt="SKALA STUDY ROOM"
          fill
          className="object-contain object-left"
          priority
        />
      </Link>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/feedback"
              className="font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              문의하기
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin/feedback"
                  className="font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  문의 관리
                </Link>
                <Link
                  href="/admin/items"
                  className="font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  아이템 관리
                </Link>
              </>
            )}
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