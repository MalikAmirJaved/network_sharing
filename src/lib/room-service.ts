import type { DeviceRow, RoomRow } from "@/lib/db";
import { onlineDeviceIds } from "@/lib/presence";
import {
  decodeCursor,
  getRoomUsage,
  listItems,
  listMembers,
  toRoomItem,
  toRoomMember,
} from "@/lib/store";
import type { RoomInfo } from "@/lib/types";

export function buildRoomInfo(
  room: RoomRow,
  device: DeviceRow,
  limit: number,
  cursor?: string | null,
): RoomInfo {
  const page = listItems(room.id, limit, decodeCursor(cursor));
  const online = onlineDeviceIds(room.code);
  const members = listMembers(room.id)
    .map((member) => toRoomMember(member, device.id, room.created_by, online))
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return b.lastSeenAt - a.lastSeenAt;
    });
  const usage = getRoomUsage(room.id);

  return {
    id: room.id,
    code: room.code,
    name: room.name,
    createdAt: room.created_at,
    expiresAt: room.expires_at,
    isOwner: room.created_by === device.id,
    hasPin: Boolean(room.pin_hash),
    usageBytes: usage.usageBytes,
    fileCount: usage.fileCount,
    items: page.rows.map((item) =>
      toRoomItem(item, device.id, room.created_by),
    ),
    members,
    nextCursor: page.nextCursor,
  };
}
