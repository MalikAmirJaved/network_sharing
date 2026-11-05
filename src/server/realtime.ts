import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { config } from "@/lib/config";
import { deviceIdFromToken, parseCookieHeader, DEVICE_COOKIE } from "@/lib/session";
import { getEventBus, type RoomEvent } from "@/lib/events";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/ids";
import {
  addPresence,
  onlineMembers,
  removePresence,
} from "@/lib/presence";
import {
  getDevice,
  getMember,
  getRoomByCode,
  isExpired,
  touchDevice,
  touchMember,
} from "@/lib/store";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@/lib/socket-types";

const channel = (code: string) => `room:${code}`;

export function setupRealtime(httpServer: HttpServer): {
  close: () => Promise<void>;
} {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    path: "/api/socket.io",
    serveClient: false,
    maxHttpBufferSize: 1_000_000,
    pingInterval: 20_000,
    pingTimeout: 20_000,
    cors: config.allowedOrigins.length
      ? { origin: config.allowedOrigins, credentials: true }
      : undefined,
  });

  io.use((socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const deviceId = deviceIdFromToken(cookies[DEVICE_COOKIE]);
    if (!deviceId) {
      next(new Error("unauthorized"));
      return;
    }
    const device = getDevice(deviceId);
    if (!device) {
      next(new Error("unauthorized"));
      return;
    }
    socket.data.deviceId = device.id;
    socket.data.deviceName = device.name;
    touchDevice(device.id);
    next();
  });

  function broadcastPresence(code: string): void {
    io.to(channel(code)).emit("presence", {
      members: onlineMembers(code),
    });
  }

  io.on("connection", (socket) => {
    let joinAttempts = 0;

    socket.on("room:join", (payload, acknowledge) => {
      joinAttempts += 1;
      if (joinAttempts > 12) {
        acknowledge?.({ ok: false, error: "rate_limited" });
        return;
      }

      const code = normalizeRoomCode(payload?.code ?? "");
      if (!isValidRoomCode(code)) {
        acknowledge?.({ ok: false, error: "invalid_code" });
        return;
      }

      const room = getRoomByCode(code);
      if (!room || isExpired(room)) {
        acknowledge?.({ ok: false, error: "room_not_found" });
        return;
      }

      const member = getMember(room.id, socket.data.deviceId);
      if (!member) {
        acknowledge?.({ ok: false, error: "not_a_member" });
        return;
      }

      if (socket.data.roomCode && socket.data.roomCode !== code) {
        socket.leave(channel(socket.data.roomCode));
        removePresence(socket.data.roomCode, socket.data.deviceId);
        broadcastPresence(socket.data.roomCode);
      }

      socket.join(channel(code));
      socket.data.roomCode = code;
      socket.data.deviceName = member.name;
      addPresence(code, socket.data.deviceId, member.name);
      touchMember(room.id, socket.data.deviceId);
      touchDevice(socket.data.deviceId);

      broadcastPresence(code);
      io.to(channel(code)).emit("member:joined", { name: member.name });
      acknowledge?.({ ok: true });
    });

    socket.on("room:leave", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      socket.leave(channel(code));
      removePresence(code, socket.data.deviceId);
      socket.data.roomCode = undefined;
      broadcastPresence(code);
    });

    socket.on("disconnect", () => {
      const code = socket.data.roomCode;
      if (!code) return;
      removePresence(code, socket.data.deviceId);
      socket.data.roomCode = undefined;
      broadcastPresence(code);
    });
  });

  const onRoomEvent = (event: RoomEvent) => {
    io.to(channel(event.roomCode)).emit(
      event.event as keyof ServerToClientEvents,
      event.payload as never,
    );
  };
  getEventBus().on("room", onRoomEvent);

  return {
    close: async () => {
      getEventBus().off("room", onRoomEvent);
      await io.close();
    },
  };
}
