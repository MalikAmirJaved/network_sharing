# API Reference

Base URL: `http://<host>:<port>`. All endpoints are JSON unless noted.

## Authentication

There is no account system. The server issues an **anonymous device cookie**:

```
Set-Cookie: netword_device=<signed-token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=15552000
```

Send cookies on every request. Browsers do this automatically with
`credentials: "same-origin"`. The token is HMAC-signed and contains the device
ID and an expiry. `COOKIE_SECURE=true` adds the `Secure` flag (HTTPS only).

Mutating endpoints also validate the `Origin` header against the request host or
`ALLOWED_ORIGINS` (defense in depth alongside `SameSite=Lax`).

## Errors

All errors use a consistent body:

```json
{
  "error": "invalid_pin",
  "message": "That PIN is not correct"
}
```

Some errors add fields:

```json
{
  "error": "pin_required",
  "message": "This room is protected by a PIN",
  "requiresPin": true,
  "room": { "code": "K7M2QX", "name": "Design team", "hasPin": true }
}
```

| Status | Meaning                                                    |
| ------ | ---------------------------------------------------------- |
| 400    | Invalid JSON or validation failure                         |
| 401    | Missing/invalid device cookie, or PIN required/incorrect   |
| 403    | Not a room member, not allowed, or bad origin              |
| 404    | Room/item/file not found or expired                        |
| 410    | Metadata exists but the file was removed from storage      |
| 413    | Upload or room quota exceeded                              |
| 416    | Invalid Range header                                       |
| 429    | Rate limited (includes `retryAfter` seconds)               |
| 500    | Unexpected server error                                    |

## System

### `GET /api/health`

Liveness/readiness probe.

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptimeSeconds": 1234,
  "rooms": 3,
  "items": 42
}
```

### `GET /api/system`

Public configuration used by the UI.

```json
{
  "version": "1.0.0",
  "lanUrls": ["http://192.168.1.24:3000"],
  "limits": {
    "maxUploadBytes": 0,
    "roomQuotaBytes": 0,
    "textMaxChars": 200000,
    "roomTtlHours": 24
  }
}
```

`0` means unlimited. Responses are cached for 60 seconds.

## Session

### `POST /api/session`

Create or refresh the device identity.

Request:

```json
{ "name": "Amber Fox" }
```

`name` is optional (1–32 chars). Response:

```json
{ "device": { "id": "8f0c…", "name": "Amber Fox" } }
```

Sets the device cookie on first use. Rate limit: 120 requests/minute/IP.

## Rooms

### `POST /api/rooms`

Create a room.

```json
{
  "name": "Design team",
  "pin": "4821",
  "ttlHours": 24,
  "deviceName": "Amber Fox"
}
```

All fields are optional. `ttlHours: 0` means the room never expires. A PIN must
be 4–32 characters and is stored as a scrypt hash.

Response `201`:

```json
{
  "room": {
    "code": "K7M2QX",
    "name": "Design team",
    "expiresAt": 1762345678901,
    "hasPin": true
  }
}
```

Rate limit: 12 rooms/minute/IP.

### `GET /api/rooms/:code`

Open a room. Query parameters: `limit` (default 50, max 200), `cursor`
(opaque). If the device is not a member and the room has no PIN, membership is
created automatically. If a PIN is required, returns `401` with `requiresPin`.

Response:

```json
{
  "id": "room-uuid",
  "code": "K7M2QX",
  "name": "Design team",
  "createdAt": 1762259278901,
  "expiresAt": 1762345678901,
  "isOwner": true,
  "hasPin": true,
  "usageBytes": 1048576,
  "fileCount": 2,
  "items": [
    {
      "id": "item-uuid",
      "kind": "file",
      "fileName": "launch-plan.pdf",
      "fileSize": 1048576,
      "mimeType": "application/pdf",
      "createdAt": 1762259300000,
      "createdBy": "device-uuid",
      "authorName": "Amber Fox",
      "canDelete": true
    }
  ],
  "members": [
    {
      "deviceId": "device-uuid",
      "name": "Amber Fox",
      "online": true,
      "isOwner": true,
      "isYou": true,
      "lastSeenAt": 1762259300000
    }
  ],
  "nextCursor": "MTc2MjI1OTMwMDAwMDppdGVtLXV1aWQ"
}
```

`nextCursor` is `null` when there are no older items.

### `POST /api/rooms/:code/join`

Join a room, optionally with a PIN.

```json
{ "pin": "4821", "deviceName": "Blue Otter" }
```

Response:

```json
{ "ok": true, "room": { "code": "K7M2QX", "name": "Design team" } }
```

Rate limit: 15 attempts/minute per room + IP.

### `DELETE /api/rooms/:code`

Owner only. Deletes the room, its items, and its upload directory, then
broadcasts `room:deleted` to connected members.

```json
{ "ok": true }
```

## Items

### `GET /api/rooms/:code/items`

Paginated feed. Query: `limit` (default 50, max 200), `cursor`.

```json
{
  "items": [
    {
      "id": "item-uuid",
      "kind": "text",
      "content": "Standup at 10:30",
      "createdAt": 1762259300000,
      "createdBy": "device-uuid",
      "authorName": "Amber Fox",
      "canDelete": true
    }
  ],
  "nextCursor": null
}
```

### `POST /api/rooms/:code/items`

Share a text note:

```json
{ "kind": "text", "content": "Standup at 10:30" }
```

Share a link:

```json
{ "kind": "url", "url": "https://example.com/docs", "title": "Example docs" }
```

Only `http` and `https` URLs are accepted. `title` is optional and defaults to
the hostname + path.

Response `201`:

```json
{
  "item": {
    "id": "item-uuid",
    "kind": "text",
    "content": "Standup at 10:30",
    "createdAt": 1762259300000,
    "createdBy": "device-uuid",
    "authorName": "Amber Fox",
    "canDelete": true
  }
}
```

Publishes `item:new`. Rate limit: 120 items/minute/device.

### `DELETE /api/rooms/:code/items/:id`

The author or the room owner may delete an item. File items also remove the file
from disk. Publishes `item:deleted`.

```json
{ "ok": true }
```

### `POST /api/rooms/:code/upload`

Raw-body upload (not multipart). Headers:

| Header         | Required | Notes                                      |
| -------------- | -------- | ------------------------------------------ |
| `Content-Type` | no       | MIME type; defaults to octet-stream        |
| `x-file-name`  | no       | URI-encoded filename; defaults to `file`   |
| `Content-Length` | no     | Used for an early size check when present  |

Send the file bytes as the request body. The server streams them to disk; it
never buffers the whole file in memory.

Response `201`:

```json
{
  "item": {
    "id": "item-uuid",
    "kind": "file",
    "fileName": "launch-plan.pdf",
    "fileSize": 1048576,
    "mimeType": "application/pdf",
    "createdAt": 1762259300000,
    "createdBy": "device-uuid",
    "authorName": "Amber Fox",
    "canDelete": true
  }
}
```

Errors: `413` when `MAX_UPLOAD_BYTES` or the room quota would be exceeded. Rate
limit: 240 uploads/minute/device.

## Files

### `GET|HEAD /api/files/:id`

Streams a file. Requires the device cookie and membership in the file's room.

Query:

- `inline=1` — request inline rendering for safe types. HTML, SVG, XML, and
  JavaScript are **always** attachments.

Request headers:

- `Range: bytes=start-end` — returns `206` with `Content-Range`; invalid ranges
  return `416` with `Content-Range: bytes */<size>`.

Response headers include:

```
Content-Type: <stored MIME or application/octet-stream>
Content-Disposition: inline|attachment; filename="..."; filename*=UTF-8''...
Accept-Ranges: bytes
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; sandbox
Cross-Origin-Resource-Policy: same-origin
```

## Socket.IO

Endpoint: `/api/socket.io` (same origin, cookie-authenticated).

### Client → server

| Event        | Payload                          | Acknowledgement                              |
| ------------ | -------------------------------- | -------------------------------------------- |
| `room:join`  | `{ code: "K7M2QX" }`             | `{ ok: true }` or `{ ok: false, error }`     |
| `room:leave` | —                                | —                                            |

`room:join` fails with `invalid_code`, `room_not_found`, `not_a_member`, or
`rate_limited` (after 12 attempts on one connection).

### Server → client

| Event           | Payload                                            |
| --------------- | -------------------------------------------------- |
| `presence`      | `{ members: [{ deviceId, name, online }] }`        |
| `item:new`      | `RoomItem`                                          |
| `item:deleted`  | `{ id }`                                            |
| `room:deleted`  | `{}`                                                |
| `member:joined` | `{ name }`                                          |

## Rate limits

Fixed-window, in-memory, keyed by IP or device. Limits reset automatically and
are cleaned up by the server worker.

| Bucket        | Limit                  | Window |
| ------------- | ---------------------- | ------ |
| `session`     | 120 / IP               | 1 min  |
| `room-create` | 12 / IP                | 1 min  |
| `room-join`   | 15 / room + IP         | 1 min  |
| `item-create` | 120 / device           | 1 min  |
| `upload`      | 240 / device           | 1 min  |
| socket join   | 12 / connection        | —      |

For multi-node deployments, replace the in-memory limiter with Redis (see
[ARCHITECTURE.md](ARCHITECTURE.md#scaling-path)).
