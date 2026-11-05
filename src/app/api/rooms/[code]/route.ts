import {
  ApiError,
  assertSameOrigin,
  json,
  parseLimit,
  route,
} from "@/lib/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";
import { buildRoomInfo } from "@/lib/room-service";
import { ensureDevice } from "@/lib/session";
import {
  addMember,
  deleteRoom,
  getMember,
  getRoomByCode,
  isExpired,
  touchDevice,
  touchMember,
} from "@/lib/store";
import { deleteRoomFiles } from "@/lib/storage";
import { publishRoomEvent } from "@/lib/events";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = getRoomByCode(code);
  if (!room || isExpired(room)) {
    throw new ApiError(404, "room_not_found", "This room does not exist or has expired");
  }

  const member = getMember(room.id, device.id);
  if (!member) {
    if (room.pin_hash) {
      throw new ApiError(
        401,
        "pin_required",
        "This room is protected by a PIN",
        {
          requiresPin: true,
          room: { code: room.code, name: room.name, hasPin: true },
        },
      );
    }
    addMember(room.id, device.id);
  }

  touchDevice(device.id);
  touchMember(room.id, device.id);

  const cursor = new URL(request.url).searchParams.get("cursor");
  return json(buildRoomInfo(room, device, parseLimit(request), cursor));
});

export const DELETE = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = getRoomByCode(code);
  if (!room || isExpired(room)) {
    throw new ApiError(404, "room_not_found", "This room does not exist or has expired");
  }
  if (room.created_by !== device.id) {
    throw new ApiError(403, "owner_only", "Only the room owner can delete this room");
  }

  await deleteRoomFiles(room.id);
  deleteRoom(room.id);
  publishRoomEvent(room.code, "room:deleted", {});
  return json({ ok: true });
});
