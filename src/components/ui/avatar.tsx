import { cn } from "@/lib/utils";

const gradients = [
  "linear-gradient(135deg, #6366f1, #22d3ee)",
  "linear-gradient(135deg, #f472b6, #f59e0b)",
  "linear-gradient(135deg, #10b981, #3b82f6)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #f97316, #ef4444)",
  "linear-gradient(135deg, #0ea5e9, #14b8a6)",
  "linear-gradient(135deg, #a855f7, #6366f1)",
  "linear-gradient(135deg, #eab308, #84cc16)",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return gradients[hash % gradients.length]!;
}

export function Avatar({
  name,
  size = 36,
  online,
  className,
}: {
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white shadow-inner"
        style={{
          backgroundImage: avatarGradient(name),
          fontSize: Math.max(10, size * 0.34),
        }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
      {online !== undefined ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-strong",
            online ? "bg-success" : "bg-faint/50",
          )}
          title={online ? "Online" : "Offline"}
        />
      ) : null}
    </span>
  );
}
