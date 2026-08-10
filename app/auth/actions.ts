"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signInWithSlack() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "slack_oidc",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/auth/error");
  }

  redirect(data.url);
}

const isDev = process.env.NODE_ENV !== "production";

// 개발 환경에서는 항상 허용. 운영 환경에서는 폼에 같이 실려온
// testLoginKey가 서버의 TEST_LOGIN_KEY와 정확히 일치할 때만 허용 —
// 로그인 페이지의 ?testAccess=<키> 쿼리 파라미터로 폼을 노출시키는 것과
// 별개로, 실제 서버 액션 단에서도 같은 키를 다시 검증해야 통과된다.
function isAuthorizedForTestLogin(formData: FormData) {
  if (isDev) return true;

  const testLoginKey = process.env.TEST_LOGIN_KEY;
  return Boolean(testLoginKey) && formData.get("testLoginKey") === testLoginKey;
}

// 여러 Slack 계정을 한 컴퓨터에서 테스트하기 어려워 만든 개발 전용 로그인 경로.
// 운영 환경에서는 TEST_LOGIN_KEY를 아는 사람만 사용할 수 있다.
export async function signUpWithEmail(formData: FormData) {
  if (!isAuthorizedForTestLogin(formData)) {
    redirect("/auth/error");
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = (formData.get("name") as string).trim();

  if (!name) {
    redirect(`/auth/error?message=${encodeURIComponent("이름을 입력해주세요.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    redirect(`/auth/error?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signInWithEmail(formData: FormData) {
  if (!isAuthorizedForTestLogin(formData)) {
    redirect("/auth/error");
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/error?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
