# Netword

**Share anything. Across any device. In seconds.**

Netword turns a machine on your local network into a private, realtime sharing
space. Create a room, share the 6-character code (or scan the QR code), and drop
files, text notes, links, and clipboard images. Everything appears instantly on
every connected device — no accounts, no cloud, no third-party services.

```
┌─────────────────────────────────────────────────────────────┐
│  Laptop  ─┐                                                 │
│  Phone   ─┼──►  Netword server (your machine)  ──►  disk   │
│  Tablet  ─┘        Socket.IO + REST + SQLite                │
└─────────────────────────────────────────────────────────────┘
             all traffic stays on your LAN
```

## Why Netword

- **LAN speed.** Bytes travel over your own Wi-Fi/Ethernet, not through a data
  centre.
- **No file-size ceiling by default.** Uploads stream straight to disk with
  backpressure, so multi-gigabyte files use flat memory. Optional caps are
  available for shared hosts.
- **More than files.** Text notes, links, images from the clipboard, drag-and-drop
  batches, and a searchable room feed.
- **Realtime.** Socket.IO presence and item events keep every device in sync.
- **Private by default.** Optional PINs hashed with scrypt, signed httpOnly
  session cookies, expiring rooms, origin checks, rate limits, and no inline
  HTML/SVG serving.
- **Beautiful and fast UI.** Dark-first design with a light theme, responsive
  layout, keyboard shortcuts, QR invites, previews, and upload progress.
- **Self-hosted and boring to operate.** One Node process, SQLite, and a folder
  of files. No external database or object store required.

## Quick start

Requirements: **Node.js 24+** (uses the built-in `node:sqlite` module) and npm.

```bash
npm install
cp .env.example .env.local   # optional; defaults work out of the box
npm run dev
```

Open the URL printed in the terminal. It prints both `Local` and `Network`
addresses:

```
  Netword is running
  Local:   http://localhost:3000
  Network: http://192.168.1.24:3000
```

Other devices on the same network open the **Network** URL, then join with the
room code or QR code.

### Production

```bash
npm run build
npm start
```

`npm start` runs the custom server (`server.ts`) with `NODE_ENV=production`,
which serves the Next.js build and the Socket.IO endpoint on one port.

## Scripts

| Script              | What it does                                              |
| ------------------- | --------------------------------------------------------- |
| `npm run dev`       | Custom server + Next dev mode with hot reload             |
| `npm run build`     | Production Next.js build                                  |
| `npm start`         | Production custom server                                  |
| `npm run typecheck` | `tsc --noEmit`                                            |
| `npm run lint`      | ESLint (includes React Compiler rules)                    |
| `npm run smoke`     | End-to-end API smoke test against a running server        |

Run the smoke test against a non-default port with:

```bash
SMOKE_BASE_URL=http://127.0.0.1:3100 npm run smoke
```

## Configuration

Copy `.env.example` to `.env.local`. All values are optional.

| Variable                   | Default | Purpose                                                        |
| -------------------------- | ------- | -------------------------------------------------------------- |
| `PORT`                     | `3000`  | HTTP port                                                      |
| `HOST`                     | `0.0.0.0` | Interface to bind (`0.0.0.0` = reachable on the LAN)         |
| `DATA_DIR`                 | `./data` | SQLite database, uploads, and generated session secret         |
| `SESSION_SECRET`           | auto    | HMAC secret for session cookies; auto-generated if omitted     |
| `ROOM_TTL_HOURS`           | `24`    | Default room lifetime; `0` = never expires                     |
| `MAX_UPLOAD_BYTES`         | `0`     | Per-file cap; `0` = unlimited                                  |
| `ROOM_QUOTA_BYTES`         | `0`     | Per-room storage cap; `0` = unlimited                          |
| `TEXT_MAX_CHARS`           | `200000`| Max characters in a text note                                  |
| `CLEANUP_INTERVAL_MINUTES` | `10`    | How often expired rooms are swept                              |
| `TRUST_PROXY`              | `0`     | Set to `1` behind a trusted reverse proxy                      |
| `COOKIE_SECURE`            | `false` | Set to `true` only when served over HTTPS                      |
| `ALLOWED_ORIGINS`          | empty   | Extra allowed browser origins, comma separated                 |
| `LOG_REQUESTS`             | `0`     | Log every HTTP request                                         |

> **Cookie warning:** on plain LAN HTTP, keep `COOKIE_SECURE=false`. Browsers
> refuse to send `Secure` cookies over `http://192.168.x.x`.

## How it works

1. A visitor gets an anonymous, signed device cookie. There is no sign-up.
2. Creating a room writes a row to SQLite and adds the creator as a member.
3. Joining with a code (and PIN, if set) adds the device to the room.
4. Items are stored in SQLite; files are streamed to
   `data/uploads/<roomId>/<itemId>`.
5. Route handlers publish domain events on an in-process event bus. The custom
   server fans them out over Socket.IO at `/api/socket.io`.
6. A cleanup worker deletes expired rooms, their files, and stale devices.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Project structure

```
server.ts                     Custom HTTP server + Socket.IO + cleanup worker
src/app/                      Next.js App Router pages and API routes
  page.tsx                    Landing page
  r/[code]/page.tsx           Room page
  api/                        REST endpoints
src/components/               UI primitives, landing page, and room experience
src/hooks/use-uploads.ts      Upload queue with progress, cancel, and retry
src/lib/                      Server core (config, db, storage, auth, files, …)
src/lib/client/               Browser helpers (API, formatting, identity)
src/server/realtime.ts        Socket.IO authentication and presence fan-out
scripts/smoke.mjs             End-to-end API smoke test
docs/                         Plan, architecture, API, security, deployment
```

## Documentation

| Document                                   | Contents                                              |
| ------------------------------------------ | ----------------------------------------------------- |
| [docs/PLAN.md](docs/PLAN.md)               | Product plan, decisions, milestones, acceptance       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, scaling path             |
| [docs/API.md](docs/API.md)                 | REST endpoints, errors, and Socket.IO events          |
| [docs/SECURITY.md](docs/SECURITY.md)       | Threat model, controls, and hardening checklist       |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)   | Local, LAN, Docker, systemd, and reverse proxy        |
| [docs/ROADMAP.md](docs/ROADMAP.md)         | Near-term and long-term improvements                  |
| [AGENTS.md](AGENTS.md)                     | Guide for coding agents working in this repository    |

## License

Private project. Add a license before distributing publicly.
