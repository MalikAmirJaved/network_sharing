// Must load before `next` so globals such as AsyncLocalStorage are installed
// (Next's CLI normally does this; a custom server has to do it explicitly).
import "next/dist/server/node-environment";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import next from "next";
import { config } from "./src/lib/config";
import { closeDb } from "./src/lib/db";
import { publishRoomEvent } from "./src/lib/events";
import { getLanUrls } from "./src/lib/network";
import { cleanupRateLimits } from "./src/lib/rate-limit";
import {
  pruneStaleDevices,
  purgeExpiredRooms,
} from "./src/lib/store";
import { deleteRoomFiles } from "./src/lib/storage";
import { setupRealtime } from "./src/server/realtime";

const dev = process.env.NODE_ENV !== "production";

async function cleanup(): Promise<void> {
  try {
    const expired = purgeExpiredRooms();
    for (const room of expired) {
      await deleteRoomFiles(room.id);
      publishRoomEvent(room.code, "room:deleted", {});
    }
    pruneStaleDevices();
    cleanupRateLimits();
    if (expired.length > 0) {
      console.log(`[cleanup] removed ${expired.length} expired room(s)`);
    }
  } catch (error) {
    console.error("[cleanup] failed", error);
  }
}

async function main(): Promise<void> {
  const handlers: {
    request?: (req: IncomingMessage, res: ServerResponse) => void;
  } = {};

  const server = createServer((req, res) => {
    // Never trust a client-supplied forwarded header unless a proxy is declared.
    const remote = req.socket.remoteAddress ?? "local";
    if (!config.trustProxy) {
      req.headers["x-real-ip"] = remote;
      delete req.headers["x-forwarded-for"];
    }

    if (config.logRequests) {
      const started = Date.now();
      res.on("finish", () => {
        console.log(
          `${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}ms`,
        );
      });
    }

    if (!handlers.request) {
      res.statusCode = 503;
      res.end("Server is starting");
      return;
    }
    handlers.request(req, res);
  });

  const app = next({
    dev,
    hostname: config.host,
    port: config.port,
    httpServer: server,
  });
  handlers.request = app.getRequestHandler();

  await app.prepare();

  const realtime = setupRealtime(server);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  await cleanup();
  const interval = setInterval(cleanup, config.cleanupIntervalMs);
  interval.unref();

  console.log("");
  console.log("  Netword is running");
  console.log(`  Local:   http://localhost:${config.port}`);
  for (const url of getLanUrls()) console.log(`  Network: ${url}`);
  console.log(`  Mode:    ${dev ? "development" : "production"}`);
  console.log("");

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[server] ${signal} received, shutting down...`);
    clearInterval(interval);

    const forceExit = setTimeout(() => process.exit(1), 10_000);
    forceExit.unref();

    try {
      await realtime.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await app.close();
      closeDb();
    } catch (error) {
      console.error("[server] shutdown error", error);
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[server] failed to start", error);
  process.exit(1);
});
