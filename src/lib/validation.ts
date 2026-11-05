import { z } from "zod";
import { config } from "@/lib/config";
import { isValidRoomCode } from "@/lib/ids";

export { isValidRoomCode };

export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function cleanName(value: string, fallback = "Guest"): string {
  const cleaned = cleanText(value).trim().replace(/\s+/g, " ").slice(0, 32);
  return cleaned || fallback;
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(32, "Name must be 32 characters or fewer");

export const deviceNameSchema = z.object({
  name: nameSchema.optional(),
});

export const createRoomSchema = z.object({
  name: z.string().trim().max(48).optional(),
  pin: z.string().trim().min(4).max(32).optional().or(z.literal("")),
  ttlHours: z.number().int().min(0).max(24 * 30).optional(),
  deviceName: nameSchema.optional(),
});

export const joinRoomSchema = z.object({
  pin: z.string().trim().max(32).optional(),
  deviceName: nameSchema.optional(),
});

export const createItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    content: z.string().min(1).max(config.textMaxChars),
  }),
  z.object({
    kind: z.literal("url"),
    url: z.string().trim().min(1).max(2048),
    title: z.string().trim().max(120).optional(),
  }),
]);

export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}
