# Roadmap

## Shipped (v1.0)

- Rooms with 6-character codes, optional scrypt PIN, automatic expiry.
- Anonymous signed device identity; no accounts.
- Text notes, URL cards, and arbitrary file uploads.
- Realtime presence and item events over Socket.IO.
- Streaming uploads to disk with no default size cap; optional per-file and
  per-room quotas.
- Range-supported downloads, safe inline previews, content-type sanitization.
- Responsive dark-first UI with light theme, QR invites, upload queue with
  progress/retry/cancel, drag-and-drop and clipboard paste, search and filters.
- SQLite (WAL) persistence, cleanup worker, health endpoint, Docker support,
  smoke test, and a full documentation set.

## Near term (v1.1)

- **Resumable uploads** — tus protocol or chunked multipart with resume after
  network interruption; removes orphaned `.part` files.
- **Server-side search** over room content (currently client-side per page) and
  per-kind bulk actions.
- **Room audit log** — who joined, who deleted, when (visible to owner).
- **Share target / PWA** — install Netword on a phone and share directly into a
  room; offline shell and queued sends.
- **Per-room retention controls** — auto-delete items after N days; download-all
  as ZIP.
- **Better presence** — typing indicator, "last active" per member.
- **Upload from URL** — paste a link and the server fetches it into the room
  (with SSRF protections).

## Mid term (v1.2 – v1.5)

- **Multi-node deployment** — PostgreSQL behind the existing repository
  interface, S3-compatible object storage for files, Redis adapter for Socket.IO
  and rate limiting/presence.
- **Roles and permissions** — owner/member/viewer; read-only rooms; per-item
  visibility.
- **Optional end-to-end encryption** — files encrypted client-side before upload
  for rooms that opt in; server stores only ciphertext.
- **OIDC/SSO for shared hosts** — e.g., Tailscale identity, Authelia, or Google
  login when running a Netword instance open to a wider group.
- **Room links** — one-tap join links with embedded (hash) secret for private
  rooms; optional one-time links.
- **Notifications** — optional push/webhook when something lands in the room.
- **Command palette** — Ctrl/Cmd+K to jump, create, search, upload.

## Long term

- **Direct device-to-device transfer** — WebRTC DataChannel for peers on the
  same LAN, with server relay as fallback.
- **LAN discovery** — mDNS/Bonjour-style discovery of Netword instances on the
  local network.
- **Sync folders** — keep a folder on each device mirrored bidirectionally.
- **Integrations** — CLI (`netword send`, `netword receive`), browser extension,
  and QR-driven "beam this file" flows.
- **Federation** — linked rooms between trusted Netword instances.
- **Rich blocks** — code snippets with highlighting, embeds, uploaded photos
  with thumbnails, stand-alone rendered Markdown notes.

## Principles

1. **Privacy first.** Nothing leaves your network unless you configure it to.
2. **Zero friction.** No account, no install, no setup for the common case.
3. **Honest scale.** Single-node simplicity now; a documented, boring path to
   multi-node when you outgrow it.
4. **Boring tech.** Standard HTTP, SQLite/WAL, Node streams — easy to operate,
   easy to back up, easy to reason about.
