"use client";

import { ArrowLeft, KeyRound, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { loadName, saveName } from "@/lib/client/identity";
import { cn } from "@/lib/utils";

export function JoinGate({
  code,
  roomName,
  requiresPin,
  onJoin,
}: {
  code: string;
  roomName: string;
  requiresPin: boolean;
  onJoin: (pin: string, name: string) => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [name, setName] = useState(() => loadName());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (requiresPin && pin.trim().length < 4) {
      setError("Enter the room PIN to continue.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const displayName = name.trim() || "Guest";
      saveName(displayName);
      await onJoin(pin.trim(), displayName);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not join this room.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-5">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-20">
        <div className="w-full max-w-md">
          <div className="surface-card rounded-3xl p-6 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent-2/20 ring-1 ring-accent/20">
              <LockKeyhole className="h-5 w-5 text-accent" />
            </div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              {requiresPin ? "This room is locked" : "Join this room"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {requiresPin
                ? `Enter the PIN to join “${roomName}”.`
                : `Join “${roomName}” to start sharing.`}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-bg-soft/50 px-3 py-1.5">
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-faint">
                Room
              </span>
              <span className="code-chip text-sm font-semibold">{code}</span>
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4">
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
                  placeholder="How others will see you"
                />
              </label>

              {requiresPin ? (
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                    <KeyRound className="h-3.5 w-3.5" />
                    Room PIN
                  </span>
                  <input
                    className={cn("field code-chip text-center text-lg")}
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    type="password"
                    inputMode="numeric"
                    autoFocus
                    autoComplete="off"
                    placeholder="••••"
                  />
                </label>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <Button type="submit" size="lg" className="w-full" loading={busy}>
                Join room
              </Button>
            </form>
          </div>
          <p className="mt-4 text-center text-xs text-faint">
            Rooms are end-to-end local — nothing leaves your network.
          </p>
        </div>
      </div>
    </div>
  );
}
