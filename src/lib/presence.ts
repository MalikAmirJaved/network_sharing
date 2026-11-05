import type { PresenceMember } from "@/lib/types";

interface PresenceEntry {
  name: string;
  sockets: number;
}

interface PresenceGlobal {
  __networdPresence?: Map<string, Map<string, PresenceEntry>>;
}

const globalStore = globalThis as unknown as PresenceGlobal;

function registry(): Map<string, Map<string, PresenceEntry>> {
  return (globalStore.__networdPresence ??= new Map());
}

export function addPresence(
  roomCode: string,
  deviceId: string,
  name: string,
): void {
  const rooms = registry();
  let devices = rooms.get(roomCode);
  if (!devices) {
    devices = new Map();
    rooms.set(roomCode, devices);
  }
  const entry = devices.get(deviceId);
  if (entry) {
    entry.sockets += 1;
    entry.name = name;
  } else {
    devices.set(deviceId, { name, sockets: 1 });
  }
}

export function removePresence(roomCode: string, deviceId: string): void {
  const rooms = registry();
  const devices = rooms.get(roomCode);
  if (!devices) return;
  const entry = devices.get(deviceId);
  if (!entry) return;
  entry.sockets -= 1;
  if (entry.sockets <= 0) devices.delete(deviceId);
  if (devices.size === 0) rooms.delete(roomCode);
}

export function onlineDeviceIds(roomCode: string): Set<string> {
  return new Set(registry().get(roomCode)?.keys() ?? []);
}

export function onlineMembers(roomCode: string): PresenceMember[] {
  const devices = registry().get(roomCode);
  if (!devices) return [];
  return [...devices.entries()].map(([deviceId, entry]) => ({
    deviceId,
    name: entry.name,
    online: true,
  }));
}

export function onlineCount(roomCode: string): number {
  return registry().get(roomCode)?.size ?? 0;
}
