import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-16 text-center dark:bg-black">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
        페이지를 찾을 수 없습니다
      </h2>
      <Link
        href="/"
        className="font-medium text-zinc-950 underline dark:text-zinc-50"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
