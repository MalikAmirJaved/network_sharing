# Netword — Product & Implementation Plan

## 1. Goal

Build a production-quality, self-hosted web app that lets devices on the same
local network share **files, text, links, and clipboard content** instantly,
with a clean and delightful UI. The reference experience is
[ssavr.com](https://www.ssavr.com/), but Netword is designed to run on the
user's own machine and keep traffic on the LAN.

## 2. Requirements

| Requirement                        | How it is met                                                        |
| ---------------------------------- | -------------------------------------------------------------------- |
| Next.js project named `netword_sharing` | `package.json` name + App Router project                        |
| Same-network sharing               | Custom Node server binds `0.0.0.0`; LAN URLs printed at boot         |
| Documents, text, URLs, "everything"| Text notes, URL cards, arbitrary file uploads, clipboard images      |
| Beautiful, clean, friendly UI/UX   | Dark-first design system, responsive layout, QR invites, previews    |
| Strong and fast sharing            | LAN transport, streamed uploads, Socket.IO realtime updates          |
| No file-sharing limit              | Streamed disk writes with no default size cap                        |
| `AGENTS.md` linking important docs | `AGENTS.md` at repo root with a documentation index                  |
| Plan first, then implementation    | This document plus [ARCHITECTURE.md](ARCHITECTURE.md)                |
| Production-level scalability       | Repository layer, pagination, WAL SQLite, documented scaling path    |

## 3. Non-goals (v1)

- Internet-wide sharing or NAT traversal.
- User accounts, teams, or long-term cloud storage.
- End-to-end encryption between browsers (the server is trusted and local).
- Peer-to-peer WebRTC transfer (server relay is simpler, resumable, and fast on
  a LAN).
- Mobile native apps (the responsive web app + QR code is enough).

## 4. Key decisions

| Decision                          | Rationale                                                                 |
| --------------------------------- | ------------------------------------------------------------------------- |
| Next.js 16 App Router + TypeScript| Modern server/client split, route handlers, typed UI                       |
| Custom Node server + Socket.IO    | One port for HTTP and realtime; no separate websocket service             |
| Server-relayed storage            | Works when peers cannot reach each other directly; survives sender leaving |
| `node:sqlite` (Node 24)           | Zero native dependencies; WAL gives good read concurrency                 |
| Stream uploads to disk            | Flat memory for arbitrarily large files; optional quotas                  |
| In-process event bus              | Route handlers stay free of Socket.IO imports; easy to swap for Redis     |
| Anonymous signed cookie           | No sign-up friction while still identifying devices and room membership   |
| scrypt PIN hashing                | Memory-hard, built into Node; no external crypto dependency               |
| Dark-first design with light mode | Matches modern sharing tools; comfortable on phones and desktops          |

## 5. Milestones

### M1 — Foundation

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4.
- [x] Custom server with Socket.IO on `/api/socket.io`.
- [x] SQLite schema, repository layer, migrations-by-schema.
- [x] Session cookies, PIN hashing, origin checks, rate limiting.
- [x] Streaming upload storage and file serving with Range support.

### M2 — Core product

- [x] Create/join/delete rooms.
- [x] Text, URL, and file items.
- [x] Realtime presence and item events.
- [x] Pagination, search, and filters.
- [x] Landing page and room experience.
- [x] QR invite, previews, upload queue, drag/drop and paste.

### M3 — Production readiness

- [x] Health endpoint and graceful shutdown.
- [x] Expired-room cleanup worker.
- [x] Security headers and CSP.
- [x] End-to-end smoke test.
- [x] Dockerfile, compose file, and deployment guide.
- [x] Documentation set and agent guide.

### M4 — Follow-ups

- [ ] Resume interrupted uploads (tus-style).
- [ ] Multi-node deployment with Postgres + S3 + Redis adapter.
- [ ] Optional end-to-end encrypted rooms.
- [ ] Room-level roles and audit log.
- [ ] Native share target / PWA offline shell.

## 6. Acceptance criteria

1. A user can create a room in under five seconds without an account.
2. A second device on the LAN can join with a 6-character code or QR code.
3. Text, links, and files shared by one device appear on the other in realtime.
4. Files download correctly, including Range requests for media seeking.
5. A room with a PIN rejects incorrect PINs and accepts the correct one.
6. Deleting an item or room removes its files from disk.
7. `npm run typecheck`, `npm run lint`, and `npm run build` pass.
8. `npm run smoke` passes against a running server.
9. The UI is usable at 360 px width and on desktop, in both themes.

## 7. Risks and mitigations

| Risk                                      | Mitigation                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Unbounded uploads fill the disk           | Optional `MAX_UPLOAD_BYTES` and `ROOM_QUOTA_BYTES`; streamed abort |
| Public exposure of a LAN tool             | Document firewall/reverse-proxy setup; PINs; expiry               |
| Cross-site request forgery                | SameSite=Lax cookie + explicit Origin check on mutations          |
| Malicious uploads served inline (XSS)     | HTML/SVG/XML/JS forced to attachment; CSP sandbox on file routes   |
| Large rooms slow the UI                   | Cursor pagination and capped page size                            |
| SQLite write contention on a busy host    | WAL mode, short transactions; documented Postgres path            |
| Stale dev server / port conflicts         | `PORT` env override; printed LAN URLs                             |

## 8. Success metrics (self-hosted)

- Time to first shared item < 10 seconds after opening the app.
- Realtime event latency within the LAN < 150 ms p95.
- Upload throughput limited by the network link, not the app.
- Zero third-party network requests from the UI.
