import os from "node:os";
import { config } from "@/lib/config";

export function getLanUrls(): string[] {
  const urls = new Set<string>();
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        urls.add(`http://${address.address}:${config.port}`);
      }
    }
  }
  if (urls.size === 0) urls.add(`http://localhost:${config.port}`);
  return [...urls];
}
