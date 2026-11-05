export interface ByteRange {
  start: number;
  end: number;
}

export function parseRange(
  header: string | null,
  size: number,
): ByteRange | null | "invalid" {
  if (!header) return null;
  if (size <= 0) return "invalid";

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return "invalid";

  const [, startPart, endPart] = match;
  if (!startPart && !endPart) return "invalid";

  let start: number;
  let end: number;

  if (!startPart && endPart) {
    const suffix = Number(endPart);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startPart);
    end = endPart ? Math.min(Number(endPart), size - 1) : size - 1;
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    start > end ||
    start >= size
  ) {
    return "invalid";
  }

  return { start, end };
}

export function contentDisposition(
  fileName: string,
  mode: "inline" | "attachment",
): string {
  const safe = fileName.replace(/[\u0000-\u001F\u007F]/g, "").slice(0, 200) || "file";
  const ascii = safe.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(safe).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

const INLINE_SAFE = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/flac",
]);

/**
 * HTML, SVG, XML and JS are intentionally excluded: serving them inline would
 * turn user uploads into a same-origin XSS vector.
 */
export function isInlineSafe(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().split(";")[0]!.trim();
  if (INLINE_SAFE.has(mime)) return true;
  if (mime.startsWith("text/plain")) return true;
  if (mime.startsWith("image/") && mime !== "image/svg+xml") return true;
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return true;
  return false;
}

export function safeMimeType(value: string | null): string {
  if (!value) return "application/octet-stream";
  const mime = value.toLowerCase().split(";")[0]!.trim();
  return /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(mime)
    ? mime
    : "application/octet-stream";
}
