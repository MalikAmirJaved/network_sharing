export const ROOM_CODE_LENGTH = 6;

export function normalizeRoomCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(value: string): boolean {
  return value.length === ROOM_CODE_LENGTH;
}
