export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

export function relativeTime(timestamp: number): string {
  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);

  if (absolute < 45) return "just now";
  if (absolute < 3600) {
    return relativeFormatter.format(Math.round(diffSeconds / 60), "minute");
  }
  if (absolute < 86_400) {
    return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour");
  }
  if (absolute < 604_800) {
    return relativeFormatter.format(Math.round(diffSeconds / 86_400), "day");
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function dayLabel(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diff = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

export function expiresIn(timestamp: number | null): string {
  if (!timestamp) return "Never";
  const diff = timestamp - Date.now();
  if (diff <= 0) return "Expired";
  if (diff < 3_600_000) return `${Math.max(1, Math.round(diff / 60_000))} min left`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)} h left`;
  return `${Math.round(diff / 86_400_000)} d left`;
}

export function fileUrl(id: string, inline = false): string {
  return `/api/files/${id}${inline ? "?inline=1" : "?download=1"}`;
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type FileCategory =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "archive"
  | "code"
  | "document"
  | "file";

export function fileCategory(mimeType?: string, fileName?: string): FileCategory {
  const mime = (mimeType ?? "").toLowerCase();
  const extension = (fileName ?? "").toLowerCase().split(".").pop() ?? "";

  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (
    ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(extension) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  ) {
    return "archive";
  }
  if (
    ["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "go", "rs", "java", "c", "cpp", "sh", "sql", "yml", "yaml", "md"].includes(
      extension,
    )
  ) {
    return "code";
  }
  if (
    ["doc", "docx", "txt", "rtf", "odt", "xls", "xlsx", "csv", "ppt", "pptx"].includes(
      extension,
    ) ||
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("sheet") ||
    mime.includes("presentation")
  ) {
    return "document";
  }
  return "file";
}

export function canPreviewInline(mimeType?: string): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime === "application/pdf" ||
    mime.startsWith("text/plain")
  );
}
