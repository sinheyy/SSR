export default function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            value === opt.value
              ? "bg-black text-white dark:bg-zinc-50 dark:text-black"
              : "text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
