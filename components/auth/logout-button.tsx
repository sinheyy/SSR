import { signOut } from "@/app/auth/actions";

export default function LogoutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="h-10 rounded-full border border-black/[.08] px-5 font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
      >
        로그아웃
      </button>
    </form>
  );
}
