import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginButton from "@/components/auth/login-button";
import DevEmailAuthForm from "@/components/auth/dev-email-auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/mypage");
  }

  const { testAccess } = await searchParams;
  const testAccessValue = typeof testAccess === "string" ? testAccess : undefined;
  const testLoginKey = process.env.TEST_LOGIN_KEY;
  // 개발 환경이거나, 운영 환경이라도 ?testAccess=<TEST_LOGIN_KEY>로 접속했을
  // 때만 테스트 로그인 폼을 노출. 단순히 파라미터가 "있는지"가 아니라 값이
  // 서버가 아는 비밀값과 정확히 일치해야 해서, 아무나 아무 값이나 붙여서
  // 우회할 수 없다.
  const showTestLogin =
    process.env.NODE_ENV !== "production" ||
    (Boolean(testLoginKey) && testAccessValue === testLoginKey);

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
          {showTestLogin && (
            <DevEmailAuthForm
              testLoginKey={
                process.env.NODE_ENV !== "production" ? undefined : testAccessValue
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
