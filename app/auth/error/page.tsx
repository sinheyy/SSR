import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        로그인에 실패했습니다
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {message ?? "로그인 중 문제가 발생했습니다. 다시 시도해 주세요."}
      </p>
      <Link href="/" className="font-medium text-zinc-950 underline dark:text-zinc-50">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
