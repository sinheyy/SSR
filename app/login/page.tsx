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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        로그인
      </h1>
      <LoginButton />
      {process.env.NODE_ENV !== "production" && <DevEmailAuthForm />}
    </div>
  );
}
