import { randomUUID } from "node:crypto";
import {
  stmt,
  transaction,
  type DeviceRow,
  type ItemRow,
  type MemberRow,
  type RoomRow,
} from "@/lib/db";
import { generateRoomCode } from "@/lib/ids";
import type { ItemKind, RoomItem, RoomMember } from "@/lib/types";

const now = () => Date.now();

/* -------------------------------------------------------------------------- */
/* Devices                                                                    */
/* -------------------------------------------------------------------------- */

export function getDevice(id: string): DeviceRow | undefined {
  return stmt("SELECT * FROM devices WHERE id = ?").get(id) as
    | DeviceRow
    | undefined;
}

export function createDevice(name: string): DeviceRow {
  const timestamp = now();
  const id = randomUUID();
  stmt(
    "INSERT INTO devices (id, name, created_at, last_seen_at) VALUES (?, ?, ?, ?)",
  ).run(id, name, timestamp, timestamp);
  return { id, name, created_at: timestamp, last_seen_at: timestamp };
}

export function updateDeviceName(id: string, name: string): void {
  stmt("UPDATE devices SET name = ?, last_seen_at = ? WHERE id = ?").run(
    name,
    now(),
    id,
  );
}

export function touchDevice(id: string): void {
  stmt("UPDATE devices SET last_seen_at = ? WHERE id = ?").run(now(), id);
}

/* -------------------------------------------------------------------------- */
/* Rooms                                                                      */
/* -------------------------------------------------------------------------- */

export function getRoomByCode(code: string): RoomRow | undefined {
  return stmt("SELECT * FROM rooms WHERE code = ?").get(code) as
    | RoomRow
    | undefined;
}

export function getRoomById(id: string): RoomRow | undefined {
  return stmt("SELECT * FROM rooms WHERE id = ?").get(id) as RoomRow | undefined;
}

export function createRoom(input: {
  name: string;
  pinHash: string | null;
  createdBy: string;
  ttlHours: number;
  maxBytes: number;
}): RoomRow {
  return transaction(() => {
    let code = generateRoomCode();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = stmt("SELECT id FROM rooms WHERE code = ?").get(code);
      if (!existing) break;
      code = generateRoomCode();
    }

    const id = randomUUID();
    const createdAt = now();
    const expiresAt =
      input.ttlHours > 0 ? createdAt + input.ttlHours * 3_600_000 : null;

    stmt(
      `INSERT INTO rooms
        (id, code, name, pin_hash, created_by, created_at, expires_at, max_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      code,
      input.name,
      input.pinHash,
      input.createdBy,
      createdAt,
      expiresAt,
      input.maxBytes,
    );

    stmt(
      "INSERT INTO room_members (room_id, device_id, joined_at, last_seen_at) VALUES (?, ?, ?, ?)",
    ).run(id, input.createdBy, createdAt, createdAt);

    return {
      id,
      code,
      name: input.name,
      pin_hash: input.pinHash,
      created_by: input.createdBy,
      created_at: createdAt,
      expires_at: expiresAt,
      max_bytes: input.maxBytes,
    };
  });
}

export function deleteRoom(roomId: string): void {
  stmt("DELETE FROM rooms WHERE id = ?").run(roomId);
}

export function isExpired(room: RoomRow): boolean {
  return room.expires_at !== null && room.expires_at <= now();
}

export function addMember(roomId: string, deviceId: string): void {
  const timestamp = now();
  stmt(
    `INSERT INTO room_members (room_id, device_id, joined_at, last_seen_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (room_id, device_id)
     DO UPDATE SET last_seen_at = excluded.last_seen_at`,
  ).run(roomId, deviceId, timestamp, timestamp);
}

export function getMember(
  roomId: string,
  deviceId: string,
): MemberRow | undefined {
  return stmt(
    `SELECT m.*, d.name AS name
     FROM room_members m
     JOIN devices d ON d.id = m.device_id
     WHERE m.room_id = ? AND m.device_id = ?`,
  ).get(roomId, deviceId) as MemberRow | undefined;
}

export function listMembers(roomId: string): MemberRow[] {
  return stmt(
    `SELECT m.*, d.name AS name
     FROM room_members m
     JOIN devices d ON d.id = m.device_id
     WHERE m.room_id = ?
     ORDER BY m.last_seen_at DESC`,
  ).all(roomId) as unknown as MemberRow[];
}

export function touchMember(roomId: string, deviceId: string): void {
  stmt(
    "UPDATE room_members SET last_seen_at = ? WHERE room_id = ? AND device_id = ?",
  ).run(now(), roomId, deviceId);
}

/* -------------------------------------------------------------------------- */
/* Items                                                                      */
/* -------------------------------------------------------------------------- */

export function listItems(
  roomId: string,
  limit: number,
  cursor?: { createdAt: number; id: string } | null,
): { rows: ItemRow[]; nextCursor: string | null } {
  const rows = (
    cursor
      ? stmt(
          `SELECT i.*, d.name AS author_name
           FROM items i JOIN devices d ON d.id = i.created_by
           WHERE i.room_id = ?
             AND (i.created_at < ? OR (i.created_at = ? AND i.id < ?))
           ORDER BY i.created_at DESC, i.id DESC
           LIMIT ?`,
        ).all(
          roomId,
          cursor.createdAt,
          cursor.createdAt,
          cursor.id,
          limit + 1,
        )
      : stmt(
          `SELECT i.*, d.name AS author_name
           FROM items i JOIN devices d ON d.id = i.created_by
           WHERE i.room_id = ?
           ORDER BY i.created_at DESC, i.id DESC
           LIMIT ?`,
        ).all(roomId, limit + 1)
  ) as unknown as ItemRow[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    rows: page,
    nextCursor: hasMore && last ? `${last.created_at}:${last.id}` : null,
  };
}

export function getItem(id: string): ItemRow | undefined {
  return stmt(
    `SELECT i.*, d.name AS author_name
     FROM items i JOIN devices d ON d.id = i.created_by
     WHERE i.id = ?`,
  ).get(id) as ItemRow | undefined;
}

export function createItem(input: {
  roomId: string;
  kind: ItemKind;
  content?: string | null;
  title?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdBy: string;
  id?: string;
}): ItemRow {
  const id = input.id ?? randomUUID();
  const createdAt = now();
  stmt(
    `INSERT INTO items
      (id, room_id, kind, content, title, file_name, file_size, mime_type, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.roomId,
    input.kind,
    input.content ?? null,
    input.title ?? null,
    input.fileName ?? null,
    input.fileSize ?? null,
    input.mimeType ?? null,
    input.createdBy,
    createdAt,
  );

  return {
    id,
    room_id: input.roomId,
    kind: input.kind,
    content: input.content ?? null,
    title: input.title ?? null,
    file_name: input.fileName ?? null,
    file_size: input.fileSize ?? null,
    mime_type: input.mimeType ?? null,
    created_by: input.createdBy,
    created_at: createdAt,
    author_name: getDevice(input.createdBy)?.name ?? "Guest",
  };
}

export function deleteItem(id: string): ItemRow | undefined {
  const item = getItem(id);
  if (!item) return undefined;
  stmt("DELETE FROM items WHERE id = ?").run(id);
  return item;
}

export function getRoomUsage(roomId: string): {
  usageBytes: number;
  fileCount: number;
} {
  const row = stmt(
    `SELECT COALESCE(SUM(file_size), 0) AS usageBytes,
            COUNT(*) AS fileCount
     FROM items WHERE room_id = ? AND kind = 'file'`,
  ).get(roomId) as { usageBytes: number; fileCount: number };
  return {
    usageBytes: Number(row.usageBytes ?? 0),
    fileCount: Number(row.fileCount ?? 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Serialization                                                              */
/* -------------------------------------------------------------------------- */

export function toRoomItem(
  row: ItemRow,
  viewerId: string,
  roomOwnerId: string,
): RoomItem {
  return {
    id: row.id,
    kind: row.kind,
    content: row.content ?? undefined,
    title: row.title ?? undefined,
    fileName: row.file_name ?? undefined,
    fileSize: row.file_size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    createdAt: row.created_at,
    createdBy: row.created_by,
    authorName: row.author_name,
    canDelete: row.created_by === viewerId || roomOwnerId === viewerId,
  };
}

export function toRoomMember(
  row: MemberRow,
  viewerId: string,
  roomOwnerId: string,
  onlineIds: Set<string>,
): RoomMember {
  return {
    deviceId: row.device_id,
    name: row.name,
    online: onlineIds.has(row.device_id),
    isOwner: row.device_id === roomOwnerId,
    isYou: row.device_id === viewerId,
    lastSeenAt: row.last_seen_at,
  };
}

export function encodeCursor(createdAt: number, id: string): string {
  return Buffer.from(`${createdAt}:${id}`).toString("base64url");
}

export function decodeCursor(
  cursor: string | null | undefined,
): { createdAt: number; id: string } | null {
  if (!cursor) return null;
  try {
    const [createdAt, id] = Buffer.from(cursor, "base64url")
      .toString("utf8")
      .split(":");
    const timestamp = Number(createdAt);
    if (!Number.isFinite(timestamp) || !id) return null;
    return { createdAt: timestamp, id };
  } catch {
    return null;
  }
}

export function purgeExpiredRooms(): { id: string; code: string }[] {
  const expired = stmt(
    "SELECT id, code FROM rooms WHERE expires_at IS NOT NULL AND expires_at <= ?",
  ).all(now()) as unknown as { id: string; code: string }[];

  for (const room of expired) {
    stmt("DELETE FROM rooms WHERE id = ?").run(room.id);
  }
  return expired;
}

export function pruneStaleDevices(days = 30): number {
  const cutoff = now() - days * 86_400_000;
  const result = stmt("DELETE FROM devices WHERE last_seen_at < ?").run(cutoff);
  return Number(result.changes ?? 0);
}
