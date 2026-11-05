"use client";

import {
  ArrowUpRight,
  Download,
  Eye,
  Link2,
  MessageSquareText,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { copyToClipboard } from "@/components/ui/copy-button";
import { useToast } from "@/components/ui/toast";
import { FileTypeIcon } from "@/components/room/file-icon";
import {
  canPreviewInline,
  fileCategory,
  fileUrl,
  formatBytes,
  hostnameOf,
  relativeTime,
} from "@/lib/client/format";
import type { RoomItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ItemCard({
  item,
  meId,
  isNew,
  onPreview,
  onDelete,
}: {
  item: RoomItem;
  meId: string;
  isNew: boolean;
  onPreview: (item: RoomItem) => void;
  onDelete: (item: RoomItem) => void;
}) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const isText = item.kind === "text";
  const isUrl = item.kind === "url";
  const isFile = item.kind === "file";
  const category = fileCategory(item.mimeType, item.fileName);
  const canPreview = isFile && canPreviewInline(item.mimeType);
  const longText = isText && (item.content?.length ?? 0) > 700;
  const content =
    isText && !expanded && longText
      ? `${item.content?.slice(0, 700)}…`
      : item.content;

  async function copyFileLink() {
    const ok = await copyToClipboard(
      `${window.location.origin}${fileUrl(item.id)}`,
    );
    toast({
      title: ok ? "File link copied" : "Couldn't copy link",
      description: ok ? "Room members can open it directly." : undefined,
      variant: ok ? "success" : "error",
    });
  }

  return (
    <article
      className={cn(
        "group relative rounded-2xl border border-line bg-surface/65 p-3.5 backdrop-blur-sm transition-colors hover:border-line-strong sm:p-4",
        isNew && "ring-glow",
      )}
    >
      <header className="flex items-center gap-2.5">
        <Avatar name={item.authorName} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-semibold">
              {item.authorName}
            </span>
            {item.createdBy === meId ? (
              <span className="rounded bg-fg/6 px-1 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wide text-faint">
                you
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.65rem] text-faint">
            <span>{relativeTime(item.createdAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {isText ? (
                <MessageSquareText className="h-3 w-3" />
              ) : isUrl ? (
                <Link2 className="h-3 w-3" />
              ) : (
                <Paperclip className="h-3 w-3" />
              )}
              {isText ? "Note" : isUrl ? "Link" : category}
            </span>
          </div>
        </div>
        {isNew ? (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-accent">
            new
          </span>
        ) : null}
      </header>

      {isText ? (
        <div className="mt-2.5">
          <p className="whitespace-pre-wrap break-words text-[0.92rem] leading-relaxed text-fg/90">
            {content}
          </p>
          {longText ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="mt-1 text-[0.7rem] font-semibold text-accent hover:text-accent-2"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {isUrl && item.content ? (
        <a
          href={item.content}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-2.5 flex items-center gap-3 rounded-xl border border-line bg-bg-soft/40 p-3 transition-colors hover:border-accent/30 hover:bg-accent/5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-2/10 text-accent-2 ring-1 ring-accent-2/20">
            <Link2 className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {item.title || hostnameOf(item.content)}
            </p>
            <p className="truncate text-[0.7rem] text-faint">{item.content}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-faint" />
        </a>
      ) : null}

      {isFile ? (
        <div className="mt-2.5">
          {category === "image" ? (
            <button
              type="button"
              onClick={() => onPreview(item)}
              className="group/image relative block w-full overflow-hidden rounded-xl border border-line bg-bg-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(item.id, true)}
                alt={item.fileName ?? "Shared image"}
                loading="lazy"
                className="max-h-72 w-full object-cover transition-transform duration-500 group-hover/image:scale-[1.015]"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8 text-[0.68rem] font-medium text-white">
                <span className="truncate">{item.fileName}</span>
                <span className="shrink-0 opacity-80">
                  {formatBytes(item.fileSize)}
                </span>
              </span>
            </button>
          ) : category === "video" ? (
            <video
              controls
              preload="metadata"
              src={fileUrl(item.id, true)}
              className="max-h-72 w-full rounded-xl border border-line bg-black"
            />
          ) : category === "audio" ? (
            <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
              <div className="flex items-center gap-3">
                <FileTypeIcon mimeType={item.mimeType} fileName={item.fileName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.fileName}</p>
                  <p className="text-[0.68rem] text-faint">
                    {formatBytes(item.fileSize)} · {item.mimeType}
                  </p>
                </div>
              </div>
              <audio
                controls
                preload="metadata"
                src={fileUrl(item.id, true)}
                className="mt-2"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-soft/40 p-3">
              <FileTypeIcon
                mimeType={item.mimeType}
                fileName={item.fileName}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.fileName}</p>
                <p className="mt-0.5 text-[0.7rem] text-faint">
                  {formatBytes(item.fileSize)} · {item.mimeType ?? "file"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {canPreview ? (
                  <button
                    type="button"
                    onClick={() => onPreview(item)}
                    className="btn btn-ghost h-8 px-2.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                ) : null}
                <a
                  href={fileUrl(item.id)}
                  download={item.fileName}
                  className="btn btn-primary h-8 px-2.5 text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <footer className="mt-2.5 flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {isText ? (
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(item.content ?? "");
              toast({
                title: ok ? "Text copied" : "Couldn't copy",
                variant: ok ? "success" : "error",
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
          >
            <Paperclip className="h-3 w-3" />
            Copy
          </button>
        ) : null}

        {isUrl && item.content ? (
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(item.content ?? "");
              toast({
                title: ok ? "Link copied" : "Couldn't copy",
                variant: ok ? "success" : "error",
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
          >
            <Link2 className="h-3 w-3" />
            Copy link
          </button>
        ) : null}

        {isFile ? (
          <>
            {canPreview && category !== "image" ? (
              <button
                type="button"
                onClick={() => onPreview(item)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              >
                <Eye className="h-3 w-3" />
                Preview
              </button>
            ) : null}
            <button
              type="button"
              onClick={copyFileLink}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
            >
              <Link2 className="h-3 w-3" />
              Copy link
            </button>
            <a
              href={fileUrl(item.id)}
              download={item.fileName}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          </>
        ) : null}

        {item.canDelete ? (
          <IconButton
            label="Delete item"
            onClick={() => onDelete(item)}
            className="ml-auto h-7 w-7 text-faint hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        ) : null}
      </footer>
    </article>
  );
}
