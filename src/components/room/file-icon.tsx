import {
  File as FileIcon,
  FileArchive,
  FileCode2,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  type LucideIcon,
} from "lucide-react";
import { fileCategory, type FileCategory } from "@/lib/client/format";
import { cn } from "@/lib/utils";

const icons: Record<FileCategory, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  pdf: FileText,
  archive: FileArchive,
  code: FileCode2,
  document: FileText,
  file: FileIcon,
};

const tones: Record<FileCategory, string> = {
  image: "text-emerald-400 bg-emerald-400/10 ring-emerald-400/20",
  video: "text-violet-400 bg-violet-400/10 ring-violet-400/20",
  audio: "text-pink-400 bg-pink-400/10 ring-pink-400/20",
  pdf: "text-rose-400 bg-rose-400/10 ring-rose-400/20",
  archive: "text-amber-400 bg-amber-400/10 ring-amber-400/20",
  code: "text-cyan-400 bg-cyan-400/10 ring-cyan-400/20",
  document: "text-blue-400 bg-blue-400/10 ring-blue-400/20",
  file: "text-slate-400 bg-slate-400/10 ring-slate-400/20",
};

export function FileTypeIcon({
  mimeType,
  fileName,
  className,
  tileClassName,
  size = "md",
}: {
  mimeType?: string;
  fileName?: string;
  className?: string;
  tileClassName?: string;
  size?: "sm" | "md" | "lg";
}) {
  const category = fileCategory(mimeType, fileName);
  const Icon = icons[category];
  const dimensions =
    size === "sm" ? "h-8 w-8 rounded-lg" : size === "lg" ? "h-14 w-14 rounded-2xl" : "h-10 w-10 rounded-xl";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4.5 w-4.5";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center ring-1",
        dimensions,
        tones[category],
        tileClassName,
      )}
    >
      <Icon className={cn(iconSize, className)} />
    </span>
  );
}
