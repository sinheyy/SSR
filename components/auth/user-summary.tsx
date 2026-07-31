import type { User } from "@supabase/supabase-js";

export default function UserSummary({ user }: { user: User }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        {user.user_metadata?.name ?? user.email ?? user.id}
      </p>
      <pre className="max-w-xl overflow-auto rounded-lg bg-zinc-100 p-4 text-left text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {JSON.stringify(user.user_metadata, null, 2)}
      </pre>
    </div>
  );
}
