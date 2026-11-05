import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { json, route } from "@/lib/http";

export const runtime = "nodejs";

export const GET = route(async () => {
  const db = getDb();
  const rooms = db.prepare("SELECT COUNT(*) AS count FROM rooms").get() as {
    count: number;
  };
  const items = db.prepare("SELECT COUNT(*) AS count FROM items").get() as {
    count: number;
  };

  return json(
    {
      status: "ok",
      version: config.version,
      uptimeSeconds: Math.round(process.uptime()),
      rooms: Number(rooms.count),
      items: Number(items.count),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
