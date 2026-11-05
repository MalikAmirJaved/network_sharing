"use client";

import { Download, FileText, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { FileTypeIcon } from "@/components/room/file-icon";
import {
  canPreviewInline,
  fileCategory,
  fileUrl,
  formatBytes,
} from "@/lib/client/format";
import type { RoomItem } from "@/lib/types";

type TextPreview = {
  status: "idle" | "loading" | "ready" | "failed";
  text: string;
};

export function PreviewModal({
  item,
  onClose,
}: {
  item: RoomItem | null;
  onClose: () => void;
}) {
  const [textPreview, setTextPreview] = useState<TextPreview>({
    status: "idle",
    text: "",
  });

  const isTextFile =
    item?.mimeType?.toLowerCase().startsWith("text/plain") ?? false;

  useEffect(() => {
    if (!item || !isTextFile) return;

    const controller = new AbortController();
    let active = true;

    void (async () => {
      if ((item.fileSize ?? 0) > 2_000_000) {
        setTextPreview({ status: "failed", text: "" });
        return;
      }

      setTextPreview({ status: "loading", text: "" });
      try {
        const response = await fetch(fileUrl(item.id, true), {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Preview unavailable");
        const value = await response.text();
        if (active) {
          setTextPreview({ status: "ready", text: value.slice(0, 400_000) });
        }
      } catch (error) {
        if (active && (error as Error).name !== "AbortError") {
          setTextPreview({ status: "failed", text: "" });
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [item, isTextFile]);

  if (!item) return null;

  const category = fileCategory(item.mimeType, item.fileName);
  const canPreview = canPreviewInline(item.mimeType);

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      hideClose
      className="max-w-4xl overflow-hidden p-0"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <FileTypeIcon
          mimeType={item.mimeType}
          fileName={item.fileName}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.fileName}</p>
          <p className="text-[0.65rem] text-faint">
            {formatBytes(item.fileSize)} · {item.mimeType ?? "file"}
          </p>
        </div>
        <a
          href={fileUrl(item.id)}
          download={item.fileName}
          className="btn btn-ghost h-8 px-2.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Download</span>
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-xl p-2 text-faint transition-colors hover:bg-fg/5 hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="max-h-[76dvh] overflow-auto bg-bg-soft/40 p-3 sm:p-4">
        {category === "image" ? (
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl(item.id, true)}
              alt={item.fileName ?? "Shared image"}
              className="max-h-[68dvh] w-auto max-w-full rounded-xl object-contain"
            />
          </div>
        ) : category === "video" ? (
          <video
            controls
            autoPlay
            preload="metadata"
            src={fileUrl(item.id, true)}
            className="max-h-[68dvh] w-full rounded-xl bg-black"
          />
        ) : category === "audio" ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <FileTypeIcon
              mimeType={item.mimeType}
              fileName={item.fileName}
              size="lg"
            />
            <p className="text-sm font-medium">{item.fileName}</p>
            <audio
              controls
              autoPlay
              preload="metadata"
              src={fileUrl(item.id, true)}
              className="w-full max-w-md"
            />
          </div>
        ) : item.mimeType === "application/pdf" ? (
          <iframe
            src={fileUrl(item.id, true)}
            title={item.fileName ?? "PDF preview"}
            className="h-[68dvh] w-full rounded-xl border border-line bg-white"
          />
        ) : isTextFile ? (
          <div className="rounded-xl border border-line bg-surface-strong">
            {textPreview.status === "loading" ||
            textPreview.status === "idle" ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading preview…
              </div>
            ) : textPreview.status === "failed" ? (
              <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted">
                <FileText className="h-6 w-6 text-faint" />
                Preview unavailable — download the file to view it.
              </div>
            ) : (
              <pre className="max-h-[64dvh] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">
                {textPreview.text}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <FileTypeIcon
              mimeType={item.mimeType}
              fileName={item.fileName}
              size="lg"
            />
            <div>
              <p className="text-sm font-semibold">{item.fileName}</p>
              <p className="mt-1 text-xs text-muted">
                {canPreview
                  ? "This format can't be previewed in the browser."
                  : "This file type is safer to download."}
              </p>
            </div>
            <a href={fileUrl(item.id)} download={item.fileName} className="btn btn-primary h-9 px-4 text-xs">
              <Download className="h-3.5 w-3.5" />
              Download file
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
