import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { paths } from "@/lib/config";

export class UploadTooLargeError extends Error {
  constructor(message = "Upload exceeds the configured limit") {
    super(message);
    this.name = "UploadTooLargeError";
  }
}

export function roomDir(roomId: string): string {
  return path.join(paths.uploads, roomId);
}

export function itemPath(roomId: string, itemId: string): string {
  return path.join(roomDir(roomId), itemId);
}

export async function ensureRoomDir(roomId: string): Promise<string> {
  const dir = roomDir(roomId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export interface SaveUploadOptions {
  roomId: string;
  itemId: string;
  body: ReadableStream<Uint8Array>;
  signal?: AbortSignal;
  maxBytes?: number;
}

/**
 * Streams a request body straight to disk. The body is never buffered in
 * memory, which is what allows arbitrarily large uploads with flat memory use.
 */
export async function saveUpload({
  roomId,
  itemId,
  body,
  signal,
  maxBytes = 0,
}: SaveUploadOptions): Promise<number> {
  await ensureRoomDir(roomId);
  const destination = itemPath(roomId, itemId);
  const temporary = `${destination}.part`;

  let bytes = 0;
  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (maxBytes > 0 && bytes > maxBytes) {
        callback(new UploadTooLargeError());
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]),
      meter,
      createWriteStream(temporary, { flags: "wx" }),
      { signal },
    );

    if (maxBytes > 0 && bytes > maxBytes) {
      throw new UploadTooLargeError();
    }

    await fs.rename(temporary, destination);
    return bytes;
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function deleteItemFile(
  roomId: string,
  itemId: string,
): Promise<void> {
  await fs.rm(itemPath(roomId, itemId), { force: true }).catch(() => undefined);
}

export async function deleteRoomFiles(roomId: string): Promise<void> {
  await fs.rm(roomDir(roomId), { recursive: true, force: true }).catch(
    () => undefined,
  );
}

export async function fileStat(
  roomId: string,
  itemId: string,
): Promise<{ size: number } | null> {
  try {
    const stat = await fs.stat(itemPath(roomId, itemId));
    return stat.isFile() ? { size: stat.size } : null;
  } catch {
    return null;
  }
}
