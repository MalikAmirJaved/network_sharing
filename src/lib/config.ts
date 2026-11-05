import path from "node:path";

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

const root = process.cwd();

export const config = {
  version: "1.0.0",
  port: int(process.env.PORT, 4000),
  host: process.env.HOST || "0.0.0.0",
  dataDir: path.resolve(
    /* turbopackIgnore: true */ root,
    process.env.DATA_DIR || "data",
  ),
  /** Default lifetime of a room in hours. 0 = never expires. */
  roomTtlHours: int(process.env.ROOM_TTL_HOURS, 24),
  /** Per-file cap in bytes. 0 = unlimited. */
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 0),
  /** Per-room storage cap in bytes. 0 = unlimited. */
  roomQuotaBytes: int(process.env.ROOM_QUOTA_BYTES, 0),
  /** Max characters in a shared text note. */
  textMaxChars: int(process.env.TEXT_MAX_CHARS, 200_000),
  /** Max items returned in one page. */
  pageSize: int(process.env.PAGE_SIZE, 50),
  maxPageSize: 200,
  trustProxy: bool(process.env.TRUST_PROXY),
  cookieSecure: bool(process.env.COOKIE_SECURE),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cleanupIntervalMs: int(process.env.CLEANUP_INTERVAL_MINUTES, 10) * 60_000,
  logRequests: bool(process.env.LOG_REQUESTS),
} as const;

export const paths = {
  db: path.join(config.dataDir, "netword.db"),
  uploads: path.join(config.dataDir, "uploads"),
  secret: path.join(config.dataDir, ".session-secret"),
};
