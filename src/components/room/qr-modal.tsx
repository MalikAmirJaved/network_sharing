"use client";

import { ExternalLink, QrCode, Wifi } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { CopyButton } from "@/components/ui/copy-button";
import { Modal } from "@/components/ui/modal";

export function QrModal({
  open,
  onClose,
  url,
  code,
  roomName,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  code: string;
  roomName: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan to join"
      description={`Point your phone camera at the code to join “${roomName}”.`}
      className="max-w-sm"
    >
      <div className="mt-2 flex flex-col items-center">
        <div className="rounded-2xl bg-white p-4 shadow-lg">
          {url ? (
            <QRCodeSVG
              value={url}
              size={208}
              bgColor="#ffffff"
              fgColor="#0b1220"
              level="M"
            />
          ) : (
            <div className="h-52 w-52 animate-pulse rounded-lg bg-slate-100" />
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-bg-soft/50 px-3 py-2">
          <QrCode className="h-4 w-4 text-accent" />
          <span className="code-chip text-lg font-semibold">{code}</span>
          <CopyButton
            value={code}
            label="Copy code"
            iconOnly
            toastMessage="Room code copied"
          />
        </div>

        <p className="mt-4 w-full break-all rounded-xl border border-line bg-bg-soft/40 px-3 py-2 text-center font-mono text-[0.65rem] text-muted">
          {url || "Preparing link…"}
        </p>

        <div className="mt-4 flex w-full items-center gap-2">
          <CopyButton
            value={url}
            label="Copy invite link"
            toastMessage="Invite link copied"
            className="flex-1 justify-center rounded-xl border border-line bg-bg-soft/40 py-2 text-xs"
          />
          <a
            href={url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-bg-soft/40 py-2 text-xs font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.65rem] text-faint">
          <Wifi className="h-3 w-3" />
          Both devices must be on the same network.
        </p>
      </div>
    </Modal>
  );
}
