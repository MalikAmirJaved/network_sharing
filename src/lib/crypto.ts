import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "@/lib/config";

const PIN_KEY_LENGTH = 32;
let cachedSecret: string | undefined;

/**
 * Session secret resolution:
 * 1. SESSION_SECRET from the environment (recommended for production).
 * 2. A random secret persisted under DATA_DIR (zero-config self-hosting).
 */
export function getSessionSecret(): string {
  if (cachedSecret) return cachedSecret;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedSecret = fromEnv;
    return cachedSecret;
  }

  try {
    if (fs.existsSync(paths.secret)) {
      const stored = fs.readFileSync(paths.secret, "utf8").trim();
      if (stored.length >= 32) {
        cachedSecret = stored;
        return cachedSecret;
      }
    }
  } catch {
    // fall through and regenerate
  }

  const generated = randomBytes(32).toString("hex");
  fs.mkdirSync(path.dirname(paths.secret), { recursive: true });
  fs.writeFileSync(paths.secret, generated, { mode: 0o600 });
  cachedSecret = generated;
  return cachedSecret;
}

export function sign(value: string): string {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function signToken(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyToken<T extends { exp?: number }>(token: string): T | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as T;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin.normalize("NFKC"), salt, PIN_KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, saltPart, hashPart] = stored.split("$");
  if (scheme !== "scrypt" || !saltPart || !hashPart) return false;

  try {
    const salt = Buffer.from(saltPart, "base64url");
    const expected = Buffer.from(hashPart, "base64url");
    const actual = scryptSync(pin.normalize("NFKC"), salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
