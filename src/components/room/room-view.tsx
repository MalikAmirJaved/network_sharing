"use client";

import { AlertTriangle, Loader2, RefreshCw, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { Wordmark } from "@/components/brand/logo";
import { Composer } from "@/components/room/composer";
import { Feed } from "@/components/room/feed";
import { JoinGate } from "@/components/room/join-gate";
import { PreviewModal } from "@/components/room/preview-modal";
import { QrModal } from "@/components/room/qr-modal";
import {
  RoomHeader,
  type ConnectionState,
} from "@/components/room/room-header";
import { Sidebar } from "@/components/room/sidebar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useUploads } from "@/hooks/use-uploads";
import { api, ClientApiError } from "@/lib/client/api";
import {
  loadName,
  rememberRoom,
} from "@/lib/client/identity";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/lib/socket-types";
import type {
  PresenceMember,
  RoomInfo,
  RoomItem,
  SystemInfo,
} from "@/lib/types";

type Phase = "loading" | "ready" | "pin" | "error";
type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface Me {
  id: string;
  name: string;
}

export function RoomView({ code }: { code: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [pinMeta, setPinMeta] = useState<{
    name: string;
    requiresPin: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [preview, setPreview] = useState<RoomItem | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    { type: "item"; item: RoomItem } | { type: "room" } | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [origin, setOrigin] = useState("");

  const socketRef = useRef<AppSocket | null>(null);
  const meRef = useRef<Me | null>(null);
  const dragDepth = useRef(0);

  const addItem = useCallback((item: RoomItem) => {
    setRoom((previous) => {
      if (!previous) return previous;
      if (previous.items.some((existing) => existing.id === item.id)) {
        return previous;
      }
      const isFile = item.kind === "file";
      return {
        ...previous,
        items: [item, ...previous.items],
        usageBytes: previous.usageBytes + (isFile ? item.fileSize ?? 0 : 0),
        fileCount: previous.fileCount + (isFile ? 1 : 0),
      };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setRoom((previous) => {
      if (!previous) return previous;
      const target = previous.items.find((item) => item.id === id);
      if (!target) return previous;
      const isFile = target.kind === "file";
      return {
        ...previous,
        items: previous.items.filter((item) => item.id !== id),
        usageBytes: Math.max(
          0,
          previous.usageBytes - (isFile ? target.fileSize ?? 0 : 0),
        ),
        fileCount: Math.max(0, previous.fileCount - (isFile ? 1 : 0)),
      };
    });
  }, []);

  const mergePresence = useCallback((members: PresenceMember[]) => {
    setRoom((previous) => {
      if (!previous) return previous;
      const map = new Map(
        previous.members.map((member) => [member.deviceId, member]),
      );
      for (const presence of members) {
        const existing = map.get(presence.deviceId);
        map.set(
          presence.deviceId,
          existing
            ? { ...existing, name: presence.name, online: presence.online }
            : {
                deviceId: presence.deviceId,
                name: presence.name,
                online: true,
                isOwner: false,
                isYou: presence.deviceId === meRef.current?.id,
                lastSeenAt: Date.now(),
              },
        );
      }
      const onlineIds = new Set(members.map((member) => member.deviceId));
      const next = [...map.values()]
        .map((member) => ({
          ...member,
          online: onlineIds.has(member.deviceId),
        }))
        .sort(
          (a, b) =>
            Number(b.online) - Number(a.online) || b.lastSeenAt - a.lastSeenAt,
        );
      return { ...previous, members: next };
    });
  }, []);

  const uploads = useUploads(
    code,
    (item) => {
      addItem(item);
      toast({
        title: "File shared",
        description: item.fileName,
        variant: "success",
      });
    },
    (message) => {
      toast({
        title: "Upload failed",
        description: message,
        variant: "error",
      });
    },
  );

  /* ---------------------------------------------------------------------- */
  /* Boot: session + room                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setPhase("loading");
      setError("");
      try {
        const name = loadName();
        const session = await api<{ device: Me }>("/api/session", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        if (cancelled) return;
        setMe(session.device);
        meRef.current = session.device;

        try {
          const info = await api<RoomInfo>(`/api/rooms/${code}`);
          if (cancelled) return;
          setRoom(info);
          setPhase("ready");
          rememberRoom(info);
        } catch (caught) {
          if (
            caught instanceof ClientApiError &&
            caught.status === 401 &&
            caught.body?.requiresPin
          ) {
            const meta = caught.body.room as
              | { name?: string; code?: string }
              | undefined;
            setPinMeta({
              name: meta?.name ?? "Protected room",
              requiresPin: true,
            });
            setPhase("pin");
            return;
          }
          throw caught;
        }
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof ClientApiError
            ? caught.message
            : "Could not open this room.",
        );
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    void (async () => {
      setOrigin(window.location.origin);
      try {
        setSystem(await api<SystemInfo>("/api/system"));
      } catch {
        // system limits are optional; fall back to defaults
      }
    })();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Realtime                                                               */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (phase !== "ready") return;

    const socket: AppSocket = io({
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnection("online");
      socket.emit("room:join", { code }, (result) => {
        if (!result?.ok) setConnection("offline");
      });
    });

    socket.on("disconnect", () => setConnection("offline"));
    socket.on("connect_error", () => setConnection("offline"));
    socket.io.on("reconnect_attempt", () => setConnection("connecting"));

    socket.on("presence", ({ members }) => mergePresence(members));

    socket.on("item:new", (item) => {
      addItem(item);
      if (item.createdBy === meRef.current?.id) return;

      setNewIds((current) => new Set(current).add(item.id));
      window.setTimeout(() => {
        setNewIds((current) => {
          const next = new Set(current);
          next.delete(item.id);
          return next;
        });
      }, 6500);

      toast({
        title:
          item.kind === "file"
            ? "New file"
            : item.kind === "url"
              ? "New link"
              : "New note",
        description:
          item.kind === "file"
            ? `${item.authorName} shared ${item.fileName ?? "a file"}`
            : item.kind === "url"
              ? `${item.authorName} shared a link`
              : `${item.authorName}: ${(item.content ?? "").slice(0, 64)}`,
      });
    });

    socket.on("item:deleted", ({ id }) => removeItem(id));
    socket.on("member:joined", ({ name }) => {
      if (name !== meRef.current?.name) {
        toast({ title: `${name} joined the room` });
      }
    });
    socket.on("room:deleted", () => {
      toast({ title: "This room was deleted", variant: "error" });
      router.push("/");
    });

    return () => {
      socket.emit("room:leave");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [phase, code, addItem, removeItem, mergePresence, router, toast]);

  /* ---------------------------------------------------------------------- */
  /* Drag, drop, paste                                                      */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const enqueue = uploads.enqueue;
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (event.dataTransfer?.files.length) {
        enqueue(event.dataTransfer.files);
      }
    };
    const onPaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) enqueue(files);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);

    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [uploads.enqueue]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                */
  /* ---------------------------------------------------------------------- */

  const sendText = useCallback(
    async (content: string) => {
      const result = await api<{ item: RoomItem }>(
        `/api/rooms/${code}/items`,
        {
          method: "POST",
          body: JSON.stringify({ kind: "text", content }),
        },
      );
      addItem(result.item);
    },
    [code, addItem],
  );

  const sendUrl = useCallback(
    async (url: string, title: string) => {
      const result = await api<{ item: RoomItem }>(
        `/api/rooms/${code}/items`,
        {
          method: "POST",
          body: JSON.stringify({ kind: "url", url, title: title || undefined }),
        },
      );
      addItem(result.item);
    },
    [code, addItem],
  );

  async function joinRoom(pin: string, name: string) {
    await api(`/api/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ pin, deviceName: name }),
    });
    const session = await api<{ device: Me }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setMe(session.device);
    meRef.current = session.device;
    const info = await api<RoomInfo>(`/api/rooms/${code}`);
    setRoom(info);
    setPhase("ready");
    rememberRoom(info);
  }

  async function loadMore() {
    if (!room?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await api<{ items: RoomItem[]; nextCursor: string | null }>(
        `/api/rooms/${code}/items?cursor=${encodeURIComponent(room.nextCursor)}`,
      );
      setRoom((previous) => {
        if (!previous) return previous;
        const known = new Set(previous.items.map((item) => item.id));
        return {
          ...previous,
          items: [
            ...previous.items,
            ...page.items.filter((item) => !known.has(item.id)),
          ],
          nextCursor: page.nextCursor,
        };
      });
    } catch (caught) {
      toast({
        title: "Couldn't load older items",
        description:
          caught instanceof Error ? caught.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setLoadingMore(false);
    }
  }

  async function confirmDelete() {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.type === "room") {
        await api(`/api/rooms/${code}`, { method: "DELETE" });
        toast({ title: "Room deleted", variant: "success" });
        router.push("/");
        return;
      }

      await api(`/api/rooms/${code}/items/${confirm.item.id}`, {
        method: "DELETE",
      });
      removeItem(confirm.item.id);
      toast({ title: "Item deleted" });
      setConfirm(null);
    } catch (caught) {
      toast({
        title: "Couldn't delete",
        description:
          caught instanceof Error ? caught.message : "Please try again.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  const joinUrl = useMemo(() => {
    if (!origin) return "";
    const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(
      origin,
    );
    const base = local && system?.lanUrls[0] ? system.lanUrls[0] : origin;
    return `${base}/r/${code}`;
  }, [origin, system, code]);

  const onlineCount =
    room?.members.filter((member) => member.online).length ?? 0;

  /* ---------------------------------------------------------------------- */
  /* Screens                                                                */
  /* ---------------------------------------------------------------------- */

  if (phase === "loading") {
    return <RoomLoading code={code} />;
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between px-5">
          <Wordmark />
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-20">
          <div className="surface-card w-full max-w-md rounded-3xl p-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              Room unavailable
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{error}</p>
            <p className="mt-2 font-mono text-xs text-faint">{code}</p>
            <div className="mt-6 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-ghost h-10 px-4"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
              <Link href="/" className="btn btn-primary h-10 px-4">
                Back home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "pin" && pinMeta) {
    return (
      <JoinGate
        code={code}
        roomName={pinMeta.name}
        requiresPin={pinMeta.requiresPin}
        onJoin={joinRoom}
      />
    );
  }

  if (!room || !me) return <RoomLoading code={code} />;

  return (
    <div className="min-h-dvh">
      <RoomHeader
        room={room}
        connection={connection}
        onlineCount={onlineCount}
        onOpenQr={() => setQrOpen(true)}
        onOpenPeople={() => setPeopleOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-4 sm:px-5 sm:pt-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <Composer
              onSendText={sendText}
              onSendUrl={sendUrl}
              uploads={uploads}
              maxTextChars={system?.limits.textMaxChars ?? 200_000}
              maxUploadBytes={system?.limits.maxUploadBytes ?? 0}
            />
            <Feed
              items={room.items}
              meId={me.id}
              nextCursor={room.nextCursor}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
              onPreview={setPreview}
              onDelete={(item) => setConfirm({ type: "item", item })}
              newIds={newIds}
            />
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20">
              <Sidebar
                room={room}
                meId={me.id}
                joinUrl={joinUrl}
                quotaBytes={system?.limits.roomQuotaBytes ?? 0}
                onOpenQr={() => setQrOpen(true)}
                onDeleteRoom={() => setConfirm({ type: "room" })}
              />
            </div>
          </aside>
        </div>
      </main>

      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-bg/80 p-6 backdrop-blur-md">
          <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-accent/40 bg-surface-strong/80 px-10 py-8 text-center shadow-2xl">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent-2/20 text-accent ring-1 ring-accent/20">
              <UploadCloud className="h-6 w-6" />
            </span>
            <p className="text-lg font-semibold">Drop to share</p>
            <p className="text-xs text-muted">
              Every file is streamed straight to this room.
            </p>
          </div>
        </div>
      ) : null}

      <QrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        url={joinUrl}
        code={room.code}
        roomName={room.name}
      />

      <Modal
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        title="Room"
        description="People, invite link, and details."
        className="max-w-md"
      >
        <div className="-mx-1">
          <Sidebar
            room={room}
            meId={me.id}
            joinUrl={joinUrl}
            quotaBytes={system?.limits.roomQuotaBytes ?? 0}
            onOpenQr={() => {
              setPeopleOpen(false);
              setQrOpen(true);
            }}
            onDeleteRoom={() => {
              setPeopleOpen(false);
              setConfirm({ type: "room" });
            }}
            compact
          />
        </div>
      </Modal>

      <PreviewModal
        key={preview?.id ?? "none"}
        item={preview}
        onClose={() => setPreview(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.type === "room" ? "Delete this room?" : "Delete this item?"}
        description={
          confirm?.type === "room"
            ? "Every shared file, note, and link will be removed from the server. This cannot be undone."
            : "This item will be removed for everyone in the room. This cannot be undone."
        }
        confirmLabel={confirm?.type === "room" ? "Delete room" : "Delete"}
        danger
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function RoomLoading({ code }: { code: string }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Wordmark />
          <div className="h-8 w-24 skeleton rounded-xl" />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 pt-5 sm:px-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="surface-card h-44 rounded-2xl" />
            <div className="surface-card h-24 rounded-2xl" />
            <div className="surface-card h-24 rounded-2xl" />
          </div>
          <div className="hidden space-y-3 lg:block">
            <div className="surface-card h-52 rounded-2xl" />
            <div className="surface-card h-40 rounded-2xl" />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-faint">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Opening room{" "}
          <span className="code-chip font-semibold text-muted">{code}</span>
        </div>
      </main>
    </div>
  );
}
