import { config } from "@/lib/config";
import { json, route } from "@/lib/http";
import { getLanUrls } from "@/lib/network";
import type { SystemInfo } from "@/lib/types";

export const runtime = "nodejs";

export const GET = route(async () => {
  const info: SystemInfo = {
    version: config.version,
    lanUrls: getLanUrls(),
    limits: {
      maxUploadBytes: config.maxUploadBytes,
      roomQuotaBytes: config.roomQuotaBytes,
      textMaxChars: config.textMaxChars,
      roomTtlHours: config.roomTtlHours,
    },
  };
  return json(info, {
    headers: { "Cache-Control": "public, max-age=60" },
  });
});
