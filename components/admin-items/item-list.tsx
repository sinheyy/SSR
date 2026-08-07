import type { EditableItem } from "@/components/admin-items/item-form";

function conditionLabel(condition: EditableItem["unlock_condition"]) {
  if (!condition) return "전체 공개";
  if (condition.type === "streak") return `연속 출석 ${condition.value}일`;
  if (condition.type === "total_hours") return `누적 공부 ${condition.value}시간`;
  if (condition.type === "manual") return "직접 지급형";
  return condition.type;
}

export default function ItemList({
  items,
  onEdit,
  onDelete,
}: {
  items: EditableItem[];
  onEdit: (item: EditableItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
        전체 아이템 ({items.length})
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 만든 아이템이 없어요</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 odd:bg-zinc-50 dark:odd:bg-zinc-800/60"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-900">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="size-full object-contain" />
                ) : (
                  <span className="text-xs text-zinc-400">-</span>
                )}
              </div>
              <span className="flex-1 truncate text-sm font-medium text-black dark:text-zinc-50">
                {item.name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                {conditionLabel(item.unlock_condition)}
              </span>
              <button
                onClick={() => onEdit(item)}
                className="shrink-0 rounded-md border border-black/[.08] px-2.5 py-1 text-xs text-zinc-600 hover:text-black dark:border-white/[.145] dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                수정
              </button>
              <button
                onClick={() => {
                  if (confirm(`"${item.name}" 아이템을 삭제할까요?`)) {
                    onDelete(item.id);
                  }
                }}
                className="shrink-0 rounded-md border border-black/[.08] px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-white/[.145] dark:text-red-400 dark:hover:bg-red-950/30"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
