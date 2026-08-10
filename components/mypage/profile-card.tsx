import { colorForUser } from "@/lib/avatar-color";
import MoodPicker from "@/components/mypage/mood-picker";
import { isMood } from "@/components/mypage/moods";

export default function ProfileCard({
  userId,
  name,
  email,
  avatarUrl,
  avatarColor,
  customItems,
  className,
  mood,
  showMood,
}: {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  customItems: { image: string; x: number; y: number; scale: number; rotation: number }[];
  className: string | null;
  mood: string | null;
  showMood: boolean;
}) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-900">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="size-16 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <div
          className={`relative flex size-16 shrink-0 items-center justify-center gap-2 rounded-2xl shadow-sm ${colorForUser(userId, avatarColor)}`}
          aria-hidden
        >
          <span className="size-2 rounded-full bg-black/50" />
          <span className="size-2 rounded-full bg-black/50" />
          {customItems.map((item, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={item.image}
              alt=""
              className="absolute size-9 object-contain"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
              }}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            {name}
          </h2>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{email}</p>
        {className && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {className}
          </p>
        )}
        <MoodPicker mood={mood && isMood(mood) ? mood : null} showMood={showMood} />
      </div>
    </div>
  );
}
