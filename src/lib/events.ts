import { EventEmitter } from "node:events";

export interface RoomEvent {
  roomCode: string;
  event: string;
  payload: unknown;
}

interface EventGlobal {
  __networdBus?: EventEmitter;
}

const globalStore = globalThis as unknown as EventGlobal;

export function getEventBus(): EventEmitter {
  return (globalStore.__networdBus ??= new EventEmitter());
}

/**
 * Route handlers publish domain events here; the custom server subscribes and
 * fans them out over Socket.IO. Keeping this as an event bus (rather than
 * importing Socket.IO into route handlers) keeps bundles clean and leaves room
 * for a Redis adapter in multi-node deployments.
 */
export function publishRoomEvent(
  roomCode: string,
  event: string,
  payload: unknown,
): void {
  getEventBus().emit("room", { roomCode, event, payload } satisfies RoomEvent);
}
