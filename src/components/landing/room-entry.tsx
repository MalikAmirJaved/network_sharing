"use client";

import {
  ArrowRight,
  DoorOpen,
  KeyRound,
  Loader2,
  Plus,
  Sparkles,
  UserRound,
  Wifi,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { api, ClientApiError } from "@/lib/client/api";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/client/codes";
import {
  loadName,
  loadRecentRooms,
  rememberRoom,
  saveName,
  type RecentRoom,
} from "@/lib/client/identity";
import type { SystemInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "create" | "join";

const ttls = [
  { value: 1, label: "1 hour" },
  { value: 8, label: "8 hours" },
  { value: 24, label: "24 hours" },
  { value: 168, label: "7 days" },
  { value: 0, label: "Never expires" },
];

export function RoomEntry() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [pin, setPin] = useState("");
  const [ttl, setTtl] = useState(24);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentRoom[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);

  useEffect(() => {
    void (async () => {
      setName(loadName());
      setRecent(loadRecentRooms());
      try {
        setSystem(await api<SystemInfo>("/api/system"));
      } catch {
        // the system panel is optional; ignore transient failures
      }
    })();
  }, []);

  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      const displayName = name.trim() || "Guest";
      saveName(displayName);
      await api("/api/session", {
        method: "POST",
        body: JSON.stringify({ name: displayName }),
      });
      const result = await api<{
        room: { code: string; name: string };
      }>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: roomName.trim() || undefined,
          pin: pin.trim() || undefined,
          ttlHours: ttl,
          deviceName: displayName,
        }),
      });
      rememberRoom(result.room);
      router.push(`/r/${result.room.code}`);
    } catch (caught) {
      const message =
        caught instanceof ClientApiError
          ? caught.message
          : "Could not create the room. Try again.";
      setError(message);
      toast({ title: "Couldn't create room", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  function joinRoom() {
    const code = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(code)) {
      setError("Enter the 6-character room code.");
      return;
    }
    const displayName = name.trim() || "Guest";
    saveName(displayName);
    router.push(`/r/${code}`);
  }

  const lanUrl = system?.lanUrls[0];

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2.2rem] bg-gradient-to-br from-accent/20 via-transparent to-accent-2/20 blur-2xl"
      />
      <div className="surface-card rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-accent" />
            Start sharing
          </div>
          <span className="chip">
            <span className="live-dot" />
            No account
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-bg-soft/60 p-1">
          {(
            [
              ["create", "Create a room", Plus],
              ["join", "Join a room", DoorOpen],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
              }}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all",
                mode === value
                  ? "bg-surface-strong text-fg shadow-sm"
                  : "text-muted hover:text-fg",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3.5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
              <UserRound className="h-3.5 w-3.5" />
              Your name
            </span>
            <input
              className="field"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={32}
              placeholder="e.g. Amber Fox"
              autoComplete="nickname"
            />
          </label>

          {mode === "create" ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Room name <span className="text-faint">(optional)</span>
                </span>
                <input
                  className="field"
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  maxLength={48}
                  placeholder="Design team, living room, standup…"
                />
              </label>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                    <KeyRound className="h-3.5 w-3.5" />
                    PIN <span className="text-faint">(optional)</span>
                  </span>
                  <input
                    className="field"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    maxLength={32}
                    placeholder="4+ characters"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted">
                    Expires
                  </span>
                  <select
                    className="field appearance-none"
                    value={ttl}
                    onChange={(event) => setTtl(Number(event.target.value))}
                  >
                    {ttls.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error ? (
                <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={createRoom}
                disabled={busy}
                className="btn btn-primary h-11 w-full"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create room
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">
                  Room code
                </span>
                <input
                  className="field code-chip py-3 text-center text-lg font-semibold"
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(normalizeRoomCode(event.target.value))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") joinRoom();
                  }}
                  maxLength={6}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={joinRoom}
                disabled={joinCode.length < 6}
                className="btn btn-primary h-11 w-full"
              >
                Join room
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-[0.7rem] text-faint">
                You&apos;ll be asked for the PIN if the room has one.
              </p>
            </>
          )}
        </div>

        {recent.length > 0 ? (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-faint">
              Recent rooms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((room) => (
                <button
                  key={room.code}
                  type="button"
                  onClick={() => router.push(`/r/${room.code}`)}
                  className="inline-flex items-center gap-2 rounded-lg border border-line bg-bg-soft/50 px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  <span className="code-chip text-[0.68rem] font-semibold text-fg">
                    {room.code}
                  </span>
                  <span className="max-w-28 truncate">{room.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {lanUrl ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/50 px-3.5 py-2.5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2 text-[0.7rem] text-muted">
            <Wifi className="h-3.5 w-3.5 shrink-0 text-success" />
            <span className="truncate">
              On this network:{" "}
              <span className="font-mono text-fg">{lanUrl}</span>
            </span>
          </div>
          <CopyButton value={lanUrl} label="Copy" iconOnly={false} />
        </div>
      ) : null}
    </div>
  );
}
