import { signInWithSlack } from "@/app/auth/actions";

function SlackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#36C5F0"
        d="M9.5 15a2.5 2.5 0 0 1-2.5 2.5A2.5 2.5 0 0 1 4.5 15a2.5 2.5 0 0 1 2.5-2.5h2.5V15Z"
      />
      <path fill="#36C5F0" d="M10.75 15a2.5 2.5 0 0 1 5 0v6.25a2.5 2.5 0 0 1-5 0V15Z" />
      <path
        fill="#2EB67D"
        d="M9 4.5A2.5 2.5 0 0 1 6.5 2 2.5 2.5 0 0 1 9 4.5v2.5H6.5A2.5 2.5 0 0 1 9 4.5Z"
      />
      <path fill="#2EB67D" d="M9 8.25a2.5 2.5 0 0 1 0 5H2.75a2.5 2.5 0 0 1 0-5H9Z" />
      <path
        fill="#ECB22E"
        d="M19.5 9a2.5 2.5 0 0 1 2.5 2.5A2.5 2.5 0 0 1 19.5 14a2.5 2.5 0 0 1-2.5-2.5V9h2.5Z"
      />
      <path fill="#ECB22E" d="M15.75 9a2.5 2.5 0 0 1-5 0V2.75a2.5 2.5 0 0 1 5 0V9Z" />
      <path
        fill="#E01E5A"
        d="M15 19.5a2.5 2.5 0 0 1 2.5 2.5 2.5 2.5 0 0 1-2.5 2.5 2.5 2.5 0 0 1-2.5-2.5V19.5H15Z"
      />
      <path fill="#E01E5A" d="M15 15.75a2.5 2.5 0 0 1 0-5h6.25a2.5 2.5 0 0 1 0 5H15Z" />
    </svg>
  );
}

export default function LoginButton() {
  return (
    <form action={signInWithSlack} className="w-full">
      <button
        type="submit"
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-zinc-300 bg-white px-6 font-medium text-black shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
      >
        <SlackIcon />
        Slack으로 로그인
      </button>
    </form>
  );
}
