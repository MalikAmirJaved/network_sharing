# Security

## Threat model

Netword is a **LAN-first** sharing tool. The default trust boundary is your
local network, not the public internet. Even so, it is built to survive:

- curious users on the same network (guessable room codes, leaked links),
- malicious uploads (stored XSS via served files),
- cross-site request forgery against the implicit session cookie,
- accidental exposure by misconfiguration,
- resource exhaustion (disk, CPU, connection floods).

It is **not** designed to defend against an attacker who fully controls your
network equipment or who can intercept plain HTTP on your LAN (HSTS/HTTPS is
your responsibility; see [DEPLOYMENT.md](DEPLOYMENT.md)).

## Controls

### Identity and sessions

- Anonymous **device cookie** (`netword_device`), HMAC-signed with
  `SESSION_SECRET`, `HttpOnly`, `SameSite=Lax`, `Max-Age` 180 days.
- No session database: the cookie is verified statelessly via HMAC.
- If `SESSION_SECRET` is unset, a random secret is generated and persisted to
  `DATA_DIR/.session-secret` (mode `0600`) so restarts do not invalidate
  sessions.
- Devices cannot be impersonated without the secret; cookies are unreadable by
  JavaScript (`HttpOnly`).

### Room access

- 6-character room codes from a 31-symbol Crockford-style alphabet (no 0/O/1/I/L),
  generated with `crypto.randomInt`.
- Optional **PIN**, normalized with NFKC, hashed with **scrypt** (random 16-byte
  salt, 32-byte key), verified with `timingSafeEqual`.
- Room membership is required for every read and write except the minimal
  `pin_required` metadata (room name only) returned by `GET /api/rooms/:code`.
- Expired rooms are indistinguishable from missing rooms (uniform `404`).
- Room deletion is owner-only.
- Membership is upserted on join and on open; `touchMember` updates presence.

### Transport and headers

- `SameSite=Lax` cookie blocks cross-site POSTs from other origins.
- Explicit **Origin check** on all mutating routes: the origin must match the
  request host or `ALLOWED_ORIGINS`.
- Security headers on every response (via `next.config.ts`):
  `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- File responses additionally carry a sandbox CSP (`default-src 'none'; sandbox`)
  and `Cross-Origin-Resource-Policy: same-origin`.
- `x-forwarded-for` is only trusted when `TRUST_PROXY=1`; the custom server
  otherwise pins `x-real-ip` to the socket address.

### File upload and serving

- Uploads are **streamed to disk**, never buffered in memory.
- Optional per-file cap (`MAX_UPLOAD_BYTES`) and per-room quota
  (`ROOM_QUOTA_BYTES`), enforced with a byte-counting transform.
- Filenames are sanitized: directory separators stripped, control characters
  removed, length-capped (200 chars).
- **Inline rendering policy:** images (except SVG), audio, video, PDF, and
  `text/plain` may be served inline for preview. HTML, SVG, XML, and JavaScript
  are always forced to `attachment` with a sandbox CSP, so an uploaded page
  cannot execute in your origin.
- `Content-Disposition` uses both ASCII `filename` and RFC 5987 `filename*`
  (UTF-8 percent-encoding with apostrophes/parentheses/spaces encoded) to avoid
  header injection and mojibake.
- Files are served with `Cache-Control: private, no-store` and `nosniff`.
- Range requests are validated; malformed ranges return `416`.
- Paths are built from the room id and item UUID only — user-controlled input
  never reaches the filesystem.

### Rate limiting and abuse

- In-memory fixed-window limiter (per IP or per device) on session creation,
  room creation, join attempts, item creation, uploads, and socket room joins.
- The cleanup worker periodically evicts stale limiter buckets.
- Room codes are unguessable in practice (31^6 ≈ 887 million combinations) and
  join attempts are rate limited.

### Input validation

- Zod schemas on every JSON endpoint.
- Names are control-character-stripped, whitespace-collapsed, and capped at 32
  chars.
- URLs are normalized and restricted to `http:`/`https:`; credentials in URLs
  are rejected.
- Text is control-character-stripped; length capped by `TEXT_MAX_CHARS`.

### Cleanup and lifecycle

- Expired rooms are purged by a worker (default every 10 minutes): database rows
  are deleted (cascading members/items) and the upload directory is removed.
- Devices not seen for 30 days are pruned.
- Deleting a room or file removes it from both SQLite and disk.

### Fail closed

- If the PIN hash is missing or malformed, verification fails.
- If an item's room expired, `GET /api/files/:id` returns `404`.
- If storage is deleted out from under the metadata, downloads return `410`.
- Any error in the API wrapper returns a structured error body without leaking
  internals (`internal_error` only in non-debug paths; details are logged
  server-side).

## Hardening checklist for production

- [ ] Set a long random `SESSION_SECRET` in the environment.
- [ ] Serve behind HTTPS (Caddy/nginx/Traefik). Plain HTTP on a shared LAN is
      sniffable; prefer a reverse proxy with a LAN CA or mTLS.
- [ ] Terminate TLS at the proxy and set `TRUST_PROXY=1`.
- [ ] Set `COOKIE_SECURE=true` once on HTTPS.
- [ ] Bind `HOST=0.0.0.0` only if you really want LAN access; otherwise
      `127.0.0.1`.
- [ ] Set `MAX_UPLOAD_BYTES` / `ROOM_QUOTA_BYTES` on shared hosts to protect the
      disk.
- [ ] Set `ROOM_TTL_HOURS` to the smallest lifetime your users need.
- [ ] Put the app behind a VPN (WireGuard/Tailscale) if you do not trust the
      LAN.
- [ ] Keep Node.js updated; `node:sqlite` is still experimental.
- [ ] Watch disk usage: `data/uploads/` grows with file sharing.
- [ ] Rotate `SESSION_SECRET` periodically (invalidates all device cookies).

## Known limitations

- The session token is stateless; there is no server-side revocation list
  (deleting a device requires rotating `SESSION_SECRET`).
- Room codes are not single-use; anyone in the room can share the code further
  (PIN protects the outer door, not the inner circle).
- Presence is per-process; not meaningful across restarts (it is rebuilt when
  clients reconnect).
- The upload endpoint is not resumable; interrupted uploads leave orphaned
  `.part` files (no item row is created, so nothing is exposed).
- There is no per-device ACL inside a room — every member can see every item.
