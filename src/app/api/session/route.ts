import { assertSameOrigin, enforceRateLimit, json, readJson, route } from "@/lib/http";
import { ensureDevice } from "@/lib/session";
import { deviceNameSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  enforceRateLimit(request, "session", 120, 60_000);
  const body = await readJson(request, deviceNameSchema);
  const device = await ensureDevice(body.name);
  return json({ device: { id: device.id, name: device.name } });
});
