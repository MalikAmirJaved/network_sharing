import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("h-9 w-9", className)}
    >
      <defs>
        <linearGradient id="netword-mark" x1="5" y1="4" x2="35" y2="36">
          <stop stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect
        x="1.1"
        y="1.1"
        width="37.8"
        height="37.8"
        rx="12"
        fill="url(#netword-mark)"
        fillOpacity="0.13"
        stroke="url(#netword-mark)"
        strokeOpacity="0.4"
      />
      <path
        d="M13 13.5 20 19.5l7-6M20 19.5V29"
        stroke="url(#netword-mark)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="13" cy="13" r="3.2" fill="url(#netword-mark)" />
      <circle cx="27" cy="13" r="3.2" fill="url(#netword-mark)" />
      <circle cx="20" cy="29.5" r="3.2" fill="url(#netword-mark)" />
    </svg>
  );
}

export function Wordmark({
  className,
  markClassName,
  href = "/",
}: {
  className?: string;
  markClassName?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-xl transition-opacity hover:opacity-90",
        className,
      )}
      aria-label="Netword home"
    >
      <LogoMark
        className={cn(
          "transition-transform duration-300 group-hover:-rotate-3",
          markClassName,
        )}
      />
      <span className="text-[1.05rem] font-semibold tracking-tight">
        Netword<span className="text-accent-2">.</span>
      </span>
    </Link>
  );
}
