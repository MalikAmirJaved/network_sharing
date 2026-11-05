"use client";

import {
  Link2,
  Paperclip,
  Send,
  Type,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FileTypeIcon } from "@/components/room/file-icon";
import { formatBytes } from "@/lib/client/format";
import type { useUploads } from "@/hooks/use-uploads";
import { cn } from "@/lib/utils";

type Tab = "text" | "link" | "files";

const tabs: { value: Tab; label: string; icon: typeof Type }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "link", label: "Link", icon: Link2 },
  { value: "files", label: "Files", icon: UploadCloud },
];

export function Composer({
  onSendText,
  onSendUrl,
  uploads,
  maxTextChars,
  maxUploadBytes,
}: {
  onSendText: (content: string) => Promise<void>;
  onSendUrl: (url: string, title: string) => Promise<void>;
  uploads: ReturnType<typeof useUploads>;
  maxTextChars: number;
  maxUploadBytes: number;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const finished = uploads.tasks.filter(
    (task) => task.status === "done" || task.status === "canceled",
  ).length;

  async function sendText() {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await onSendText(content);
      setText("");
      toast({ title: "Note shared", variant: "success" });
    } catch (error) {
      toast({
        title: "Couldn't send note",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }

  async function sendUrl() {
    const value = url.trim();
    if (!value) return;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http and https links are supported.");
      }
    } catch (error) {
      toast({
        title: "Invalid link",
        description:
          error instanceof Error
            ? error.message
            : "Include https:// in the URL.",
        variant: "error",
      });
      return;
    }

    setSending(true);
    try {
      await onSendUrl(value, title.trim());
      setUrl("");
      setTitle("");
      toast({ title: "Link shared", variant: "success" });
    } catch (error) {
      toast({
        title: "Couldn't share link",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="surface-card overflow-hidden rounded-2xl">
      <div className="flex items-center gap-1 border-b border-line/70 px-2.5 py-2">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
              tab === value
                ? "bg-fg/6 text-fg"
                : "text-muted hover:bg-fg/5 hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 pr-1 text-[0.65rem] text-faint sm:inline-flex">
          <Paperclip className="h-3 w-3" />
          Drop anywhere · paste images
        </span>
      </div>

      <div className="p-3 sm:p-4">
        {tab === "text" ? (
          <div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void sendText();
                }
              }}
              rows={3}
              maxLength={maxTextChars}
              placeholder="Write a note for everyone in the room…"
              className="field min-h-24 resize-none border-transparent bg-transparent px-1 py-1 text-[0.95rem] leading-relaxed focus:bg-transparent focus:shadow-none"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-[0.68rem] text-faint">
                {text.length > maxTextChars * 0.8
                  ? `${text.length.toLocaleString()} / ${maxTextChars.toLocaleString()}`
                  : "⌘ / Ctrl + Enter to send"}
              </span>
              <Button
                size="sm"
                onClick={() => void sendText()}
                disabled={!text.trim() || sending}
                loading={sending}
              >
                {sending ? null : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "link" ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-faint" />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void sendUrl();
                }}
                placeholder="https://example.com/article"
                className="field border-transparent bg-transparent px-1 focus:bg-transparent focus:shadow-none"
                inputMode="url"
              />
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void sendUrl();
              }}
              placeholder="Label (optional)"
              maxLength={120}
              className="field border-transparent bg-transparent px-1 text-xs focus:bg-transparent focus:shadow-none"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[0.68rem] text-faint">
                Opens in a new tab for everyone
              </span>
              <Button
                size="sm"
                onClick={() => void sendUrl()}
                disabled={!url.trim() || sending}
                loading={sending}
              >
                Share link
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "files" ? (
          <div>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  uploads.enqueue(event.target.files);
                  event.target.value = "";
                }
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-bg-soft/40 px-4 py-7 text-center transition-colors hover:border-accent/40 hover:bg-accent/5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-accent-2/15 text-accent ring-1 ring-accent/20 transition-transform group-hover:-translate-y-0.5">
                <UploadCloud className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">Choose files to share</span>
              <span className="text-[0.7rem] text-faint">
                {maxUploadBytes > 0
                  ? `Up to ${formatBytes(maxUploadBytes)} per file`
                  : "No size limit · streamed straight to disk"}
              </span>
            </button>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[0.68rem] text-faint">
                You can also drop files anywhere on the page.
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-accent hover:text-accent-2"
              >
                <Paperclip className="h-3 w-3" /> Browse
              </button>
            </div>
          </div>
        ) : null}

        {uploads.tasks.length > 0 ? (
          <div className="mt-4 space-y-2 border-t border-line/70 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-faint">
                Uploads
              </p>
              {finished > 1 ? (
                <button
                  type="button"
                  onClick={uploads.clearFinished}
                  className="text-[0.68rem] font-medium text-muted hover:text-fg"
                >
                  Clear finished
                </button>
              ) : null}
            </div>

            {uploads.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-bg-soft/40 px-2.5 py-2"
              >
                <FileTypeIcon fileName={task.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-medium">{task.name}</p>
                    <span
                      className={cn(
                        "shrink-0 text-[0.62rem] font-medium",
                        task.status === "error"
                          ? "text-danger"
                          : task.status === "done"
                            ? "text-success"
                            : "text-faint",
                      )}
                    >
                      {task.status === "uploading"
                        ? `${task.progress}%`
                        : task.status === "queued"
                          ? "Waiting"
                          : task.status === "done"
                            ? "Shared"
                            : task.status === "error"
                              ? "Failed"
                              : "Canceled"}
                    </span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-300",
                        task.status === "error"
                          ? "bg-danger"
                          : task.status === "done"
                            ? "bg-success"
                            : "bg-gradient-to-r from-accent to-accent-2",
                      )}
                      style={{
                        width:
                          task.status === "done"
                            ? "100%"
                            : `${task.progress}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[0.62rem] text-faint">
                      {formatBytes(task.size)}
                      {task.error ? ` · ${task.error}` : ""}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {task.status === "error" ? (
                        <button
                          type="button"
                          onClick={() => uploads.retry(task.id)}
                          className="rounded px-1 text-[0.62rem] font-semibold text-accent hover:text-accent-2"
                        >
                          Retry
                        </button>
                      ) : null}
                      {task.status === "uploading" || task.status === "queued" ? (
                        <button
                          type="button"
                          onClick={() => uploads.cancel(task.id)}
                          aria-label="Cancel upload"
                          className="rounded p-0.5 text-faint hover:text-fg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => uploads.dismiss(task.id)}
                          aria-label="Dismiss upload"
                          className="rounded p-0.5 text-faint hover:text-fg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
