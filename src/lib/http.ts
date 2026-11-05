import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { config } from "@/lib/config";
import type { DeviceRow } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { ensureDevice } from "@/lib/session";
import { getRoomByCode, isExpired, getMember } from "@/lib/store";
import type { RoomRow } from "@/lib/db";
import type { ApiErrorBody } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message?: string,
    extra: Record<string, unknown> = {},
  ) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function json<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.code, message: error.message, ...error.extra },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid request";
    return NextResponse.json(
      { error: "invalid_request", message },
      { status: 400 },
    );
  }

  console.error("[api] unhandled error", error);
  return NextResponse.json(
    { error: "internal_error", message: "Something went wrong" },
    { status: 500 },
  );
}

export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export function clientIp(request: Request): string {
  if (config.trustProxy) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}

/**
 * Cookie auth + SameSite=Lax already blocks most cross-site POSTs. This adds an
 * explicit origin check for browser requests as defense in depth.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new ApiError(403, "invalid_origin");
  }

  if (config.allowedOrigins.includes(parsed.origin)) return;

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host && parsed.host === host) return;

  throw new ApiError(403, "invalid_origin", "Request origin is not allowed");
}

export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }
  return schema.parse(body);
}

export async function requireDevice(name?: string): Promise<DeviceRow> {
  return ensureDevice(name);
}

export function enforceRateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
  suffix = "",
): void {
  const key = `${bucket}:${suffix}:${clientIp(request)}`;
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many requests. Please wait a moment and try again.",
      { retryAfter: result.retryAfterSeconds },
    );
  }
}

export interface RoomAccess {
  room: RoomRow;
  device: DeviceRow;
}

export async function requireRoomMember(
  code: string,
  deviceId: string,
): Promise<RoomRow> {
  const room = getRoomByCode(code);
  if (!room || isExpired(room)) {
    throw new ApiError(404, "room_not_found", "This room does not exist or has expired");
  }
  const member = getMember(room.id, deviceId);
  if (!member) {
    throw new ApiError(403, "not_a_member", "Join this room first", {
      requiresPin: Boolean(room.pin_hash),
    });
  }
  return room;
}

export function parseLimit(
  request: Request,
  fallback = config.pageSize,
): number {
  const url = new URL(request.url);
  const raw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return fallback;
  return Math.min(raw, config.maxPageSize);
}
