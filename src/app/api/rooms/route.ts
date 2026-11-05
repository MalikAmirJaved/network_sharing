import { config } from "@/lib/config";
import { hashPin } from "@/lib/crypto";
import {
  assertSameOrigin,
  enforceRateLimit,
  json,
  readJson,
  route,
} from "@/lib/http";
import { createRoom } from "@/lib/store";
import { ensureDevice } from "@/lib/session";
import { cleanText, createRoomSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  enforceRateLimit(request, "room-create", 12, 60_000);

  const body = await readJson(request, createRoomSchema);
  const device = await ensureDevice(body.deviceName);

  const name = cleanText(body.name ?? "").trim().slice(0, 48) || "Shared room";
  const pin = body.pin?.trim() || null;
  const room = createRoom({
    name,
    pinHash: pin ? hashPin(pin) : null,
    createdBy: device.id,
    ttlHours: body.ttlHours ?? config.roomTtlHours,
    maxBytes: config.roomQuotaBytes,
  });

  return json(
    {
      room: {
        code: room.code,
        name: room.name,
        expiresAt: room.expires_at,
        hasPin: Boolean(room.pin_hash),
      },
    },
    { status: 201 },
  );
});
