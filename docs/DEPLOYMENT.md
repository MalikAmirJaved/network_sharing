# Deployment

Netword is a single Node.js process. Everything it needs lives in `DATA_DIR`.

## Options

| Scenario                      | Approach                                  |
| ----------------------------- | ----------------------------------------- |
| Quick share on your PC        | `npm run dev` or `npm run build && npm start` |
| Always-on LAN server          | `systemd` service / Task Scheduler       |
| Container / one-command run   | Docker + docker compose                   |
| Shared/hosted machine         | HTTPS reverse proxy + `TRUST_PROXY=1`    |
| Untrusted network             | VPN (WireGuard/Tailscale) + Netword       |

## Prerequisites

- **Node.js 24+** (uses `node:sqlite`).
- Roughly `50 MB` RAM baseline + room for streamed file buffers.
- Disk space for `DATA_DIR` (uploads live there).

## 1. Run on your machine (development)

```bash
npm install
npm run dev
```

Prints `Local` and `Network` URLs. Other devices on the same Wi-Fi/Ethernet open
the Network URL.

> Port already in use? `PORT=3100 npm run dev` (macOS/Linux) or
> `$env:PORT=3100; npm run dev` (PowerShell).

## 2. Production on the host

```bash
npm install        # npm ci in CI
npm run build
npm start
```

`npm start` sets `NODE_ENV=production` and runs `server.ts` with tsx. The build
is served from `.next/` and the Socket.IO endpoint shares the same port.

### Persisting data

All state lives in `DATA_DIR` (default `./data`):

```
data/
  netword.db          SQLite database (rooms, devices, items)
  netword.db-wal      Write-ahead log
  uploads/<roomId>/   Uploaded files
  .session-secret     Auto-generated HMAC secret (if SESSION_SECRET is unset)
```

Back up `DATA_DIR` to preserve rooms. Restore by copying it back.

## 3. systemd (Linux)

`/etc/systemd/system/netword.service`:

```ini
[Unit]
Description=Netword LAN sharing
After=network.target

[Service]
Type=simple
User=netword
Group=netword
WorkingDirectory=/opt/netword
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=0.0.0.0
Environment=DATA_DIR=/var/lib/netword
Environment=SESSION_SECRET=change-me-to-a-long-random-string
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/lib/netword
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now netword
journalctl -u netword -f
```

## 4. Windows service / Task Scheduler

```powershell
# build first
npm run build
# then register a scheduled task at boot (or use nssm / winsw for a true service)
schtasks /Create /SC ONSTART /TN Netword /TR "cmd /c cd /d E:\NetworkSharing && npm start" /RU SYSTEM
```

Ensure the port is allowed through the Windows firewall:

```powershell
New-NetFirewallRule -DisplayName "Netword" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000
```

## 5. Docker

Build and run:

```bash
docker build -t netword:latest .
docker run -d --name netword \
  -p 3000:3000 \
  -v netword-data:/app/data \
  -e SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  netword:latest
```

With compose (recommended):

```bash
docker compose up -d
docker compose logs -f
```

`docker-compose.yml` mounts a named volume at `/app/data`, publishes port 3000,
and includes a health check against `/api/health`.

## 6. Reverse proxy (HTTPS + WebSockets)

When exposing Netword beyond a trusted LAN, terminate TLS at a proxy. You must
forward the WebSocket upgrade or realtime will fall back to polling.

### Caddy

```caddy
share.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy handles the WebSocket upgrade automatically.

### nginx

```nginx
server {
    listen 443 ssl;
    server_name share.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";      # WebSocket
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;                   # large uploads
        client_max_body_size 0;                     # do not cap the body
    }
}
```

Set in the environment:

```
TRUST_PROXY=1
COOKIE_SECURE=true
ALLOWED_ORIGINS=https://share.example.com
```

## 7. Health checks and monitoring

- `GET /api/health` → `{ status: "ok", version, uptimeSeconds, rooms, items }`.
- Docker: the compose file already probes this endpoint.
- External monitoring: alert on non-200 responses or `uptimeSeconds` resets.
- Logs: the server logs startup, cleanup, and (optionally) every request with
  `LOG_REQUESTS=1`.

## 8. Upgrading

```bash
# back up first
cp -r data data.bak-$(date +%F)

git pull           # or copy new release
npm ci
npm run build
npm start          # or restart the service
```

SQLite schema is created/updated idempotently at boot; no migration command is
required for compatible versions.

## 9. Troubleshooting

| Problem                          | Fix                                                            |
| -------------------------------- | -------------------------------------------------------------- |
| Other devices cannot reach it    | Check `HOST=0.0.0.0`, firewall, and the printed Network URL    |
| `Another next dev server...`     | Stop the stale process or change `PORT`                        |
| Realtime does not update         | Check proxy WebSocket upgrade; browser console for socket errors |
| Cookies not set over HTTPS       | Set `COOKIE_SECURE=true`; ensure HTTPS is real, not self-signed without trust |
| Large upload fails               | Set `client_max_body_size 0` at the proxy; check disk space     |
| Database locked / busy           | Reduce concurrent writers; ensure WAL is enabled (default)       |
| Room disappeared                 | It expired (`ROOM_TTL_HOURS`); data was purged by cleanup        |
| Windows: port already in use     | `Get-NetTCPConnection -LocalPort 3000` then `Stop-Process` it   |
