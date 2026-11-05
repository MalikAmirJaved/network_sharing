<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — working on Netword

Netword is a self-hosted LAN file/text/link sharing app: Next.js 16 (App
Router) + TypeScript + Tailwind v4, with a custom Node server hosting both the
HTTP app and a Socket.IO endpoint on one port.

## Documentation index

Read these before making non-trivial changes:

| Document | What it covers |
| -------- | -------------- |
| [README.md](README.md) | Quick start, scripts, configuration |
| [docs/PLAN.md](docs/PLAN.md) | Product plan, milestones, acceptance criteria |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data model, scaling path |
| [docs/API.md](docs/API.md) | REST endpoints, errors, Socket.IO events |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, controls, hardening |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local, LAN, Docker, systemd, reverse proxy |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Shipped and planned features |

If you change behavior that any of these documents describe, update the document
in the same change.

## Commands

```bash
npm install          # install dependencies
npm run dev          # custom server + Next dev (hot reload)
npm run build        # production build
npm start            # production server
npm run typecheck    # tsc --noEmit
npm run lint         # eslint (includes React Compiler rules)
npm run smoke        # end-to-end API smoke test (needs a running server)
```

The app defaults to port `3000`. Use `PORT=3100 npm run dev` if that port is
taken by another dev server.

## Architecture in one paragraph

`server.ts` loads `next/dist/server/node-environment` (required before `next`
to install globals), creates a plain HTTP server, passes it to `next({ httpServer })`,
and attaches Socket.IO at `/api/socket.io`. Route handlers under `src/app/api/`
use helpers from `src/lib/http.ts` (`route()`, `assertSameOrigin`,
`rateLimit`, `requireRoomMember`). Uploads are streamed with
`saveUpload()`/`pipeline()` — never buffered in memory. Files are stored at
`data/uploads/<roomId>/<itemId>`; metadata is in SQLite via `src/lib/store.ts`.
Events reach realtime via an in-process bus (`src/lib/events.ts`).

## Conventions

- **Types first.** Shared DTOs live in `src/lib/types.ts`; API bodies are parsed
  by Zod schemas in `src/lib/validation.ts`.
- **No SQL in route handlers.** Use `src/lib/store.ts`. No filesystem access
  outside `src/lib/storage.ts` and `src/lib/files.ts`.
- **Errors flow through `ApiError`** and `errorResponse()` so the client gets a
  consistent `{ error, message }` body.
- **Uploads are streams.** Do not `await request.arrayBuffer()` for files.
- **Client components** are the only place with `"use client"`. Event handlers
  and browser APIs stay out of server modules.
- **React Compiler** is enabled (`eslint-config-next` 16); do not call setState
  synchronously in effect bodies. Move work into an async IIFE, a callback, or
  a store.
- **Styling:** Tailwind v4 with CSS variables; see `src/app/globals.css`.
  Reuse `.surface-card`, `.field`, `.btn`, `.chip` instead of re-defining
  shadows/borders inline.
- **Icons:** `lucide-react` (v1.x). **QR:** `qrcode.react`. Both are
  self-hosted; no CDN links.

## Gotchas

- `next/dist/server/node-environment` must be the first import in `server.ts`.
- `TRUST_PROXY=0` (default) pins `x-real-ip` to the socket address; do not trust
  forwarded headers from the internet.
- `COOKIE_SECURE=true` breaks plain-HTTP LAN access by design.
- SQLite uses WAL; do not delete `-wal`/`-shm` files while the app is running.
- The `@/` alias maps to `./src/*`; tsx resolves it at runtime.
- `LayoutProps<"/">` is a generated global type from `.next/types`.
- `.next/` and `data/` are git-ignored; never commit them.

## When changing the API

1. Update the Zod schema and the route handler.
2. Update `src/lib/types.ts` if the DTO changes.
3. Update [docs/API.md](docs/API.md) (and [docs/SECURITY.md](docs/SECURITY.md)
   if the threat surface changes).
4. Extend `scripts/smoke.mjs` so `npm run smoke` still passes.
5. Run `npm run typecheck && npm run lint && npm run build`.

## When changing the UI

1. Keep server components as server components; add `"use client"` only where
   interactivity is required.
2. Reuse components in `src/components/ui/` before adding new ones.
3. Verify at 360 px width, tablet, and desktop; check both themes.
4. Keep accessible labels (`aria-label`, `title`) on icon-only buttons.
5. Never reference local assets outside `public/` or build-managed imports.
