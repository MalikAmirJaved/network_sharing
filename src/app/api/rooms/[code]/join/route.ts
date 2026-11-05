import { verifyPin } from "@/lib/crypto";
import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
  route,
} from "@/lib/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";
import { ensureDevice } from "@/lib/session";
import {
  addMember,
  getRoomByCode,
  isExpired,
  touchDevice,
  touchMember,
} from "@/lib/store";
import { joinRoomSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

export const POST = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  enforceRateLimit(request, "room-join", 15, 60_000, code);

  const body = await readJson(request, joinRoomSchema);
  const device = await ensureDevice(body.deviceName);
  const room = getRoomByCode(code);
  if (!room || isExpired(room)) {
    throw new ApiError(404, "room_not_found", "This room does not exist or has expired");
  }

  if (room.pin_hash) {
    if (!body.pin || !verifyPin(body.pin, room.pin_hash)) {
      throw new ApiError(401, "invalid_pin", "That PIN is not correct");
    }
  }

  addMember(room.id, device.id);
  touchDevice(device.id);
  touchMember(room.id, device.id);

  return json({ ok: true, room: { code: room.code, name: room.name } });
});
