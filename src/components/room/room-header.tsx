"use client";

import {
  LogOut,
  QrCode,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { IconButton } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { RoomInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ConnectionState = "connecting" | "online" | "offline";

const connectionLabel: Record<ConnectionState, string> = {
  connecting: "Connecting",
  online: "Live",
  offline: "Reconnecting",
};

export function RoomHeader({
  room,
  connection,
  onlineCount,
  onOpenQr,
  onOpenPeople,
}: {
  room: RoomInfo;
  connection: ConnectionState;
  onlineCount: number;
  onOpenQr: () => void;
  onOpenPeople: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-5">
        <Wordmark markClassName="h-8 w-8" className="shrink-0" />
        <span className="hidden h-6 w-px bg-line sm:block" />
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <h1 className="truncate text-sm font-semibold tracking-tight sm:text-[0.95rem]">
            {room.name}
          </h1>
          <div className="hidden items-center gap-0.5 rounded-lg border border-line bg-surface/50 py-0.5 pl-2 pr-0.5 sm:flex">
            <span className="code-chip text-[0.7rem] font-semibold text-muted">
              {room.code}
            </span>
            <CopyButton
              value={room.code}
              label="Copy room code"
              iconOnly
              toastMessage="Room code copied"
            />
          </div>
          {room.hasPin ? (
            <span className="chip hidden py-1 text-[0.62rem] md:inline-flex">
              PIN
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[0.68rem] font-medium sm:inline-flex",
              connection === "online"
                ? "text-success"
                : connection === "connecting"
                  ? "text-warning"
                  : "text-danger",
            )}
            title={`Realtime: ${connectionLabel[connection]}`}
          >
            {connection === "offline" ? (
              <WifiOff className="h-3 w-3" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            {connectionLabel[connection]}
          </span>

          <button
            type="button"
            onClick={onOpenPeople}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface/50 px-2.5 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg lg:hidden"
            aria-label="View people"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="tabular-nums">{onlineCount}</span>
          </button>

          <span className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface/50 px-2.5 py-1.5 text-xs font-medium text-muted lg:inline-flex">
            <span className="live-dot" />
            <span className="tabular-nums">{onlineCount}</span> online
          </span>

          <IconButton label="Show QR code" onClick={onOpenQr}>
            <QrCode className="h-4 w-4" />
          </IconButton>

          <ThemeToggle className="hidden sm:inline-flex" />

          <Link
            href="/"
            aria-label="Leave room"
            title="Leave room"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-fg/5 hover:text-fg"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line/50 px-4 py-1.5 sm:hidden">
        <span className="code-chip text-[0.68rem] font-semibold text-muted">
          {room.code}
        </span>
        <CopyButton
          value={room.code}
          label="Copy"
          iconOnly
          toastMessage="Room code copied"
        />
        <span className="ml-auto inline-flex items-center gap-1 text-[0.65rem] text-faint">
          {connection === "offline" ? (
            <WifiOff className="h-3 w-3 text-danger" />
          ) : (
            <Wifi className="h-3 w-3 text-success" />
          )}
          {connectionLabel[connection]}
        </span>
      </div>
    </header>
  );
}
