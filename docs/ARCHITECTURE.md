# Architecture

## Overview

Netword is a single-node Next.js application with a custom Node HTTP server. It
serves the UI, the REST API, and a Socket.IO endpoint on one port. SQLite stores
metadata; uploaded files live on disk.

```
┌───────────────────────────────────────────────────────────────────────┐
│                            Browser (any device)                        │
│  Next.js client components  ──  fetch /api/*  ──  socket.io-client     │
└───────────────┬───────────────────────────────────────────┬───────────┘
                │ HTTP                                      │ WebSocket
                ▼                                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│  server.ts (Node HTTP server)                                          │
│  ├─ Next.js request handler  ──►  src/app/api/* route handlers         │
│  └─ Socket.IO server at /api/socket.io  ──►  src/server/realtime.ts    │
│                                                                       │
│  Route handlers ──► src/lib/* (validation, store, storage, session)    │
│  Route handlers ──► src/lib/events.ts (in-process EventEmitter)        │
│  realtime.ts    ◄── EventEmitter ──► io.to(room).emit(...)             │
└───────────────┬───────────────────────────────────────────────────────┘
                │
      ┌─────────┴──────────┐
      ▼                    ▼
┌──────────────┐    ┌──────────────────────────────┐
│ SQLite (WAL) │    │ data/uploads/<roomId>/<itemId>│
│ data/*.db    │    │ streamed, Range-served        │
└──────────────┘    └──────────────────────────────┘
```

## Runtime pieces

| Path                        | Responsibility                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| `server.ts`                 | HTTP server, trusted-IP handling, Socket.IO attach, cleanup, shutdown |
| `src/server/realtime.ts`    | Socket auth, room join validation, presence, event fan-out         |
| `src/app/api/*`             | REST route handlers                                                |
| `src/lib/config.ts`         | Environment-driven configuration                                   |
| `src/lib/db.ts`             | `node:sqlite` connection, schema, cached statements, transactions   |
| `src/lib/store.ts`          | Repository functions and row-to-DTO serialization                  |
| `src/lib/storage.ts`        | Streamed uploads, file deletion, stats                             |
| `src/lib/session.ts`        | Signed device cookie and device lifecycle                          |
| `src/lib/crypto.ts`         | HMAC session tokens and scrypt PIN hashing                         |
| `src/lib/http.ts`           | Route wrapper, errors, origin checks, rate limiting                |
| `src/lib/events.ts`         | In-process room event bus                                          |
| `src/lib/presence.ts`       | In-memory online-device registry                                   |
| `src/lib/room-service.ts`   | Room DTO assembly with pagination and presence                     |
| `src/lib/files.ts`          | Range parsing, safe MIME types, content disposition                |
| `src/lib/network.ts`        | LAN address discovery                                              |
| `src/lib/validation.ts`     | Zod schemas and text/URL sanitization                              |

## Data model

```
devices ──1:N── room_members ──N:1── rooms
   │                                  │
   └────────1:N── items ──────────────┘
```

- `devices`: anonymous browser identities. `id` is a UUID; `name` is a friendly
  display name.
- `rooms`: `code` (unique, 6 chars), optional `pin_hash`, `created_by`,
  `expires_at`, optional `max_bytes`.
- `room_members`: join table with `joined_at` / `last_seen_at` for presence
  fallback.
- `items`: `kind` (`text` | `url` | `file`), content/link metadata, file
  metadata, author, timestamp.

Indexes:

- `idx_items_room_created` supports the room feed cursor pagination.
- `idx_room_members_device` supports "rooms for this device" lookups.

SQLite runs in WAL mode with `synchronous=NORMAL`, foreign keys enabled, and
short `BEGIN IMMEDIATE` transactions for multi-row writes.

## Request flows

### Create room

1. `POST /api/session` ensures a device row and sets the signed cookie.
2. `POST /api/rooms` validates input, hashes the optional PIN with scrypt,
   generates a unique code, inserts the room and creator membership in one
   transaction.
3. The client navigates to `/r/<code>`.

### Join room

1. `GET /api/rooms/<code>` returns room info if the device is a member.
2. If the room has a PIN and the device is not a member, it returns `401` with
   `requiresPin` and limited room metadata.
3. `POST /api/rooms/<code>/join` verifies the PIN (scrypt + timing-safe compare)
   and upserts membership.

### Share a file

1. The browser sends a raw-body `POST /api/rooms/<code>/upload` with
   `x-file-name` and `content-type`.
2. The route checks membership, quota, and optional per-file cap.
3. `saveUpload()` streams the request body through a byte-counting transform to
   `<itemId>.part`, then renames it into place.
4. On success, the item row is inserted and `item:new` is published.
5. On failure, the partial file is removed and no row is created.

### Download / stream a file

1. `GET /api/files/<id>` checks the device cookie and room membership.
2. It resolves the stored file, parses `Range`, and streams with
   `createReadStream` (supporting `206 Partial Content`).
3. Safe MIME types may be served inline with `?inline=1`; everything else is an
   attachment. Responses carry `nosniff`, a sandbox CSP, and
   `Cross-Origin-Resource-Policy: same-origin`.

### Realtime

1. The client connects to `/api/socket.io`; the handshake cookie identifies the
   device.
2. `room:join` validates that the device is a room member, joins a Socket.IO
   channel, and registers presence.
3. Route handlers publish `{ roomCode, event, payload }` on the in-process bus.
4. `realtime.ts` forwards those events to the room channel.
5. Disconnects remove presence and broadcast the updated member list.

## Pagination

The feed uses a stable cursor of `(created_at, id)` encoded as base64url.
`listItems()` fetches `limit + 1` rows to detect `nextCursor`. This avoids the
offset drift that appears when new items arrive at the top of the feed.

## Presence

Presence is intentionally in-memory: it is cheap, accurate for a single node,
and disappears when the process restarts. The database stores `last_seen_at` as
a fallback so members can still be shown as offline.

## Scaling path

The current design is optimized for a single machine (the common LAN case).
When one node is no longer enough:

| Concern            | Current                     | Scale-out option                                      |
| ------------------ | --------------------------- | ----------------------------------------------------- |
| Metadata           | SQLite (WAL)                | PostgreSQL with the same repository interface         |
| Files              | Local disk                  | S3-compatible object storage + signed URLs            |
| Realtime fan-out   | In-process EventEmitter     | Redis pub/sub + `@socket.io/redis-adapter`            |
| Presence           | In-memory map               | Redis hashes with TTL                                 |
| Rate limits        | In-memory fixed window      | Redis counters                                        |
| Session revocation | Signed stateless token      | Short-lived tokens + refresh table                    |
| Cleanup            | In-process interval         | Dedicated worker/cron with advisory locks             |
| Uploads            | Single request stream       | tus resumable protocol or multipart to object storage |

The repository layer (`src/lib/store.ts`) and storage module isolate most of
these changes. Route handlers should not grow direct SQL or filesystem calls.

## Failure modes

- **Process crash during upload:** `.part` files are orphaned; a future cleanup
  pass should remove `.part` files older than a threshold. No item row exists,
  so nothing is exposed.
- **Disk full:** the write stream errors, the partial file is removed, and the
  API returns `500`. The room remains usable for text/links.
- **Database locked:** SQLite uses a 5 s busy timeout; writes are short.
- **Realtime outage:** the UI still works via REST; the header shows
  “Reconnecting”.
- **Expired room:** the cleanup worker deletes the row (cascading members/items)
  and the upload directory, then broadcasts `room:deleted`.

## Performance notes

- Uploads are never buffered in memory; throughput is bounded by the network and
  disk.
- File downloads use streams and support Range requests for video/audio seeking.
- Feed pages are capped (`PAGE_SIZE`, `MAX_PAGE_SIZE`) to protect the server.
- The UI filters/search client-side over the loaded page; server-side search can
  be added when rooms grow large.
- Static assets are served by Next.js with immutable caching in production.
