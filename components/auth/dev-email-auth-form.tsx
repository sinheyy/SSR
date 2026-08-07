import { signInWithEmail, signUpWithEmail } from "@/app/auth/actions";

export default function DevEmailAuthForm() {
  return (
    <form className="flex w-full flex-col gap-2 rounded-2xl border border-dashed border-zinc-300 p-4 text-left dark:border-zinc-700">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        개발용 이메일 로그인 (여러 계정 테스트용)
        <br />
        처음 쓰는 이메일이면 회원가입만 누르세요 (가입과 동시에 로그인됩니다)
      </p>
      <input
        name="name"
        placeholder="이름 (회원가입 시 필요)"
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="email"
        type="email"
        placeholder="이메일"
        required
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        name="password"
        type="password"
        placeholder="비밀번호 (6자 이상)"
        required
        minLength={6}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex gap-2">
        <button
          formAction={signUpWithEmail}
          className="flex-1 rounded-full border border-zinc-300 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          회원가입
        </button>
        <button
          formAction={signInWithEmail}
          className="flex-1 rounded-full bg-foreground py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          로그인
        </button>
      </div>
    </form>
  );
}
