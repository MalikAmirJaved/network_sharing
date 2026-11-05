"use client";

import {
  Clock3,
  Crown,
  HardDrive,
  KeyRound,
  QrCode,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  expiresIn,
  formatBytes,
  formatDate,
  relativeTime,
} from "@/lib/client/format";
import type { RoomInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  room,
  meId,
  joinUrl,
  quotaBytes = 0,
  onOpenQr,
  onDeleteRoom,
  compact = false,
}: {
  room: RoomInfo;
  meId: string;
  joinUrl: string;
  quotaBytes?: number;
  onOpenQr: () => void;
  onDeleteRoom: () => void;
  compact?: boolean;
}) {
  const online = room.members.filter((member) => member.online).length;
  const quotaPercent =
    quotaBytes > 0
      ? Math.min(100, Math.round((room.usageBytes / quotaBytes) * 100))
      : 0;

  return (
    <div className={cn("space-y-3", compact && "pb-2")}>
      <section className="surface-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-accent" />
            People
          </h2>
          <span className="chip py-1 text-[0.62rem]">
            <span className="live-dot" />
            {online} online
          </span>
        </div>

        <ul className="mt-3 space-y-1">
          {room.members.map((member) => (
            <li
              key={member.deviceId}
              className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-fg/4"
            >
              <Avatar name={member.name} size={30} online={member.online} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium">{member.name}</p>
                  {member.deviceId === meId ? (
                    <span className="rounded bg-fg/6 px-1 py-0.5 text-[0.52rem] font-semibold uppercase tracking-wide text-faint">
                      you
                    </span>
                  ) : null}
                  {member.isOwner ? (
                    <Crown className="h-3 w-3 shrink-0 text-warning" />
                  ) : null}
                </div>
                <p className="text-[0.62rem] text-faint">
                  {member.online
                    ? "In the room"
                    : `Seen ${relativeTime(member.lastSeenAt)}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Invite people</h2>
          <button
            type="button"
            onClick={onOpenQr}
            className="inline-flex items-center gap-1 text-[0.68rem] font-semibold text-accent hover:text-accent-2"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR code
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-line-strong bg-bg-soft/40 px-3 py-2.5 text-center">
          <p className="text-[0.6rem] uppercase tracking-[0.16em] text-faint">
            Room code
          </p>
          <p className="code-chip mt-0.5 text-xl font-semibold">{room.code}</p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2">
          <CopyButton
            value={room.code}
            label="Copy code"
            toastMessage="Room code copied"
            className="px-1.5"
          />
          <CopyButton
            value={joinUrl || room.code}
            label="Copy link"
            toastMessage="Invite link copied"
            className="px-1.5"
          />
        </div>
      </section>

      <section className="surface-card rounded-2xl p-4">
        <h2 className="text-sm font-semibold">Room details</h2>
        <dl className="mt-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              Created
            </dt>
            <dd className="font-medium">{formatDate(room.createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <Clock3 className="h-3.5 w-3.5" />
              Expires
            </dt>
            <dd className="font-medium">{expiresIn(room.expiresAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <KeyRound className="h-3.5 w-3.5" />
              PIN
            </dt>
            <dd className="font-medium">
              {room.hasPin ? "Protected" : "Not set"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-muted">
              <HardDrive className="h-3.5 w-3.5" />
              Storage
            </dt>
            <dd className="font-medium">
              {formatBytes(room.usageBytes)}
              <span className="text-faint"> · {room.fileCount} files</span>
            </dd>
          </div>
        </dl>

        {quotaBytes > 0 ? (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
            <p className="mt-1 text-[0.62rem] text-faint">
              {quotaPercent}% of {formatBytes(quotaBytes)} room quota
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-line bg-gradient-to-br from-accent/8 to-accent-2/8 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          Tip
        </div>
        <p className="mt-1.5 text-[0.7rem] leading-relaxed text-muted">
          Paste a screenshot straight into the composer, or drop a whole folder
          of files anywhere on this page.
        </p>
      </section>

      {room.isOwner ? (
        <section className="rounded-2xl border border-danger/20 bg-danger/5 p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-danger">
            <Trash2 className="h-3.5 w-3.5" />
            Danger zone
          </h2>
          <p className="mt-1.5 text-[0.68rem] leading-relaxed text-muted">
            Deleting the room removes every shared item and file from this
            server immediately.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={onDeleteRoom}
            className="mt-3 w-full"
          >
            Delete room
          </Button>
        </section>
      ) : null}
    </div>
  );
}
