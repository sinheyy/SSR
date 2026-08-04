export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-16 text-center dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        메인페이지
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        상단 네비게이션에서 로그인하거나 마이페이지로 이동해 보세요.
      </p>
    </div>
  );
}
