import { signInWithSlack } from "@/app/auth/actions";

export default function LoginButton() {
  return (
    <form action={signInWithSlack}>
      <button
        type="submit"
        className="h-12 rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Slack으로 로그인
      </button>
    </form>
  );
}
