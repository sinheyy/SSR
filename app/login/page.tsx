import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginButton from "@/components/auth/login-button";
import DevEmailAuthForm from "@/components/auth/dev-email-auth-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/mypage");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-black/[.08] bg-white shadow-sm dark:border-white/[.145] dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-6 px-8 pb-8 pt-10">
          <div className="relative h-16 w-52">
            <Image
              src="/assets/logo-v2.png"
              alt="SKALA STUDY ROOM"
              fill
              sizes="208px"
              className="object-contain"
              priority
            />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">
              스터디룸에 오신 걸 환영해요
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Slack 계정으로 로그인하고 자리에 앉아보세요
            </p>
          </div>
          <LoginButton />
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            로그인 시{" "}
            <a href="/privacy" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
              개인정보 처리방침
            </a>
            에 동의한 것으로 간주됩니다
          </p>
          {process.env.NODE_ENV !== "production" && <DevEmailAuthForm />}
        </div>
      </div>
    </div>
  );
}
