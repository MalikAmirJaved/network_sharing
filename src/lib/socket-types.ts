import type { PresenceMember, RoomItem } from "@/lib/types";

export interface ServerToClientEvents {
  presence: (payload: { members: PresenceMember[] }) => void;
  "item:new": (item: RoomItem) => void;
  "item:deleted": (payload: { id: string }) => void;
  "room:deleted": () => void;
  "member:joined": (payload: { name: string }) => void;
}

export interface ClientToServerEvents {
  "room:join": (
    payload: { code: string },
    acknowledge?: (result: { ok: boolean; error?: string }) => void,
  ) => void;
  "room:leave": () => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  deviceId: string;
  deviceName: string;
  roomCode?: string;
}
