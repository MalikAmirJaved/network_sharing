import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { ApiError, route } from "@/lib/http";
import {
  contentDisposition,
  isInlineSafe,
  parseRange,
  safeMimeType,
} from "@/lib/files";
import { getDeviceFromCookies } from "@/lib/session";
import { getItem, getMember, getRoomById, isExpired } from "@/lib/store";
import { fileStat, itemPath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

async function serve(
  request: Request,
  id: string,
  headOnly: boolean,
): Promise<Response> {
  const device = await getDeviceFromCookies();
  if (!device) {
    throw new ApiError(401, "unauthorized", "Open a room before downloading files");
  }

  const item = getItem(id);
  if (!item || item.kind !== "file") {
    throw new ApiError(404, "file_not_found", "This file no longer exists");
  }

  const room = getRoomById(item.room_id);
  if (!room || isExpired(room)) {
    throw new ApiError(404, "file_not_found", "This file no longer exists");
  }
  if (!getMember(room.id, device.id)) {
    throw new ApiError(403, "forbidden", "You do not have access to this file");
  }

  const stat = await fileStat(room.id, item.id);
  if (!stat) {
    throw new ApiError(410, "file_missing", "The file was removed from storage");
  }

  const size = stat.size;
  const mime = safeMimeType(item.mime_type);
  const wantsInline =
    new URL(request.url).searchParams.get("inline") === "1" &&
    isInlineSafe(mime);
  const disposition = contentDisposition(
    item.file_name ?? "file",
    wantsInline ? "inline" : "attachment",
  );

  const range = parseRange(request.headers.get("range"), size);
  if (range === "invalid") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${size}`,
        "Accept-Ranges": "bytes",
      },
    });
  }

  const headers = new Headers({
    "Content-Type": mime === "text/plain" ? "text/plain; charset=utf-8" : mime,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Cross-Origin-Resource-Policy": "same-origin",
  });

  let status = 200;
  let start: number | undefined;
  let end: number | undefined;

  if (range) {
    status = 206;
    start = range.start;
    end = range.end;
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
  } else {
    headers.set("Content-Length", String(size));
  }

  if (headOnly) {
    return new Response(null, { status, headers });
  }

  const stream = createReadStream(
    itemPath(room.id, item.id),
    start !== undefined && end !== undefined ? { start, end } : undefined,
  );

  return new Response(
    Readable.toWeb(stream) as ReadableStream<Uint8Array>,
    { status, headers },
  );
}

export const GET = route(async (request: Request, context: Context) => {
  const { id } = await context.params;
  return serve(request, id, false);
});

export const HEAD = route(async (request: Request, context: Context) => {
  const { id } = await context.params;
  return serve(request, id, true);
});
