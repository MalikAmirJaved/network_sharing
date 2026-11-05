import { randomUUID } from "node:crypto";
import { config } from "@/lib/config";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  requireRoomMember,
  route,
} from "@/lib/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";
import { ensureDevice } from "@/lib/session";
import {
  createItem,
  getRoomUsage,
  toRoomItem,
} from "@/lib/store";
import {
  deleteItemFile,
  saveUpload,
  UploadTooLargeError,
} from "@/lib/storage";
import { publishRoomEvent } from "@/lib/events";
import { safeMimeType } from "@/lib/files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ code: string }> };

function decodeFileName(value: string | null): string {
  if (!value) return "file";
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // keep the raw value if it was not URI-encoded
  }
  const base = decoded.split(/[\\/]/).pop() ?? "file";
  const clean = base.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200);
  return clean || "file";
}

export const POST = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = await requireRoomMember(code, device.id);
  enforceRateLimit(request, "upload", 240, 60_000, device.id);

  if (!request.body) {
    throw new ApiError(400, "missing_body", "No file data was received");
  }

  const fileName = decodeFileName(request.headers.get("x-file-name"));
  const mimeType = safeMimeType(request.headers.get("content-type"));
  const contentLengthRaw = request.headers.get("content-length");
  const contentLength = contentLengthRaw
    ? Number.parseInt(contentLengthRaw, 10)
    : null;

  const usage = getRoomUsage(room.id);
  const quotaRemaining =
    room.max_bytes > 0 ? room.max_bytes - usage.usageBytes : null;

  if (quotaRemaining !== null && quotaRemaining <= 0) {
    throw new ApiError(413, "room_quota_exceeded", "This room has no storage left");
  }

  const caps = [config.maxUploadBytes, quotaRemaining ?? 0].filter(
    (value) => value > 0,
  );
  const maxBytes = caps.length > 0 ? Math.min(...caps) : 0;

  if (contentLength !== null && maxBytes > 0 && contentLength > maxBytes) {
    throw new ApiError(413, "file_too_large", "This file exceeds the upload limit", {
      maxBytes,
    });
  }

  const itemId = randomUUID();
  let size: number;

  try {
    size = await saveUpload({
      roomId: room.id,
      itemId,
      body: request.body,
      signal: request.signal,
      maxBytes,
    });
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      throw new ApiError(413, "file_too_large", "This file exceeds the upload limit", {
        maxBytes,
      });
    }
    throw error;
  }

  try {
    const item = createItem({
      id: itemId,
      roomId: room.id,
      kind: "file",
      fileName,
      fileSize: size,
      mimeType,
      createdBy: device.id,
    });
    const payload = toRoomItem(item, device.id, room.created_by);
    publishRoomEvent(room.code, "item:new", payload);
    return json({ item: payload }, { status: 201 });
  } catch (error) {
    await deleteItemFile(room.id, itemId);
    throw error;
  }
});
