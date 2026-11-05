import {
  ApiError,
  assertSameOrigin,
  enforceRateLimit,
  json,
  parseLimit,
  readJson,
  requireRoomMember,
  route,
} from "@/lib/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/ids";
import { ensureDevice } from "@/lib/session";
import {
  createItem,
  decodeCursor,
  listItems,
  toRoomItem,
} from "@/lib/store";
import { publishRoomEvent } from "@/lib/events";
import { cleanText, createItemSchema, normalizeUrl } from "@/lib/validation";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

export const GET = route(async (request: Request, context: Context) => {
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = await requireRoomMember(code, device.id);
  const cursor = new URL(request.url).searchParams.get("cursor");
  const page = listItems(room.id, parseLimit(request), decodeCursor(cursor));

  return json({
    items: page.rows.map((item) =>
      toRoomItem(item, device.id, room.created_by),
    ),
    nextCursor: page.nextCursor,
  });
});

export const POST = route(async (request: Request, context: Context) => {
  assertSameOrigin(request);
  const { code: rawCode } = await context.params;
  const code = normalizeRoomCode(rawCode);
  if (!isValidRoomCode(code)) {
    throw new ApiError(404, "room_not_found", "This room does not exist");
  }

  const device = await ensureDevice();
  const room = await requireRoomMember(code, device.id);
  enforceRateLimit(request, "item-create", 120, 60_000, device.id);

  const body = await readJson(request, createItemSchema);

  let item;
  if (body.kind === "text") {
    const content = cleanText(body.content).trim();
    if (!content) throw new ApiError(400, "empty_text", "Message cannot be empty");
    item = createItem({
      roomId: room.id,
      kind: "text",
      content,
      createdBy: device.id,
    });
  } else {
    const url = normalizeUrl(body.url);
    if (!url) {
      throw new ApiError(400, "invalid_url", "Only http and https links are supported");
    }
    const parsed = new URL(url);
    const title =
      cleanText(body.title ?? "").trim() ||
      `${parsed.hostname}${parsed.pathname === "/" ? "" : parsed.pathname}`;
    item = createItem({
      roomId: room.id,
      kind: "url",
      content: url,
      title: title.slice(0, 120),
      createdBy: device.id,
    });
  }

  const payload = toRoomItem(item, device.id, room.created_by);
  publishRoomEvent(room.code, "item:new", payload);
  return json({ item: payload }, { status: 201 });
});
