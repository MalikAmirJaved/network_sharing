import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { signToken, verifyToken } from "@/lib/crypto";
import { createDevice, getDevice, updateDeviceName } from "@/lib/store";
import type { DeviceRow } from "@/lib/db";
import { cleanName } from "@/lib/validation";

export const DEVICE_COOKIE = "netword_device";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

interface DeviceToken {
  d: string;
  exp: number;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      result[key] = decodeURIComponent(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
}

export function deviceIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const payload = verifyToken<DeviceToken>(token);
  if (!payload?.d) return null;
  return payload.d;
}

export function makeDeviceCookie(deviceId: string): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  };
} {
  return {
    name: DEVICE_COOKIE,
    value: signToken({
      d: deviceId,
      exp: Date.now() + MAX_AGE_SECONDS * 1000,
    } satisfies DeviceToken),
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  };
}

export async function getDeviceFromCookies(): Promise<DeviceRow | null> {
  const store = await cookies();
  const deviceId = deviceIdFromToken(store.get(DEVICE_COOKIE)?.value);
  if (!deviceId) return null;
  return getDevice(deviceId) ?? null;
}

/**
 * Returns the current device, creating one on first visit. Route handlers are
 * the only place this should be used because it can set the session cookie.
 */
export async function ensureDevice(name?: string): Promise<DeviceRow> {
  const store = await cookies();
  const existingId = deviceIdFromToken(store.get(DEVICE_COOKIE)?.value);

  if (existingId) {
    const existing = getDevice(existingId);
    if (existing) {
      if (name) {
        const cleaned = cleanName(name, existing.name);
        if (cleaned !== existing.name) updateDeviceName(existing.id, cleaned);
        existing.name = cleaned;
      }
      return existing;
    }
  }

  const device = createDevice(cleanName(name ?? "", "Guest"));
  const cookie = makeDeviceCookie(device.id);
  store.set(cookie.name, cookie.value, cookie.options);
  return device;
}
