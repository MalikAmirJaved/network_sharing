import {
  ApiError,
  assertSameOrigin,
  json,
  requireRoomMember,
  route,
} from "@/lib/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";
import { ensureDevice } from "@/lib/session";
import { deleteItem, getItem } from "@/lib/store";
import { deleteItemFile } from "@/lib/storage";
import { publishRoomEvent } from "@/lib/events";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string; id: string }> };

export const DELETE = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { code: rawCode, id } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = await requireRoomMember(code, device.id);
  const item = getItem(id);

  if (!item || item.room_id !== room.id) {
    throw new ApiError(404, "item_not_found", "This item no longer exists");
  }
  if (item.created_by !== device.id && room.created_by !== device.id) {
    throw new ApiError(403, "forbidden", "You cannot delete this item");
  }

  if (item.kind === "file") {
    await deleteItemFile(room.id, item.id);
  }
  deleteItem(item.id);
  publishRoomEvent(room.code, "item:deleted", { id: item.id });

  return json({ ok: true });
});
