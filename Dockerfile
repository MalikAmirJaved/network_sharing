# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Build stage: install deps, build the Next.js production bundle, then prune
# devDependencies so the runtime image only ships what it needs.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
    && npm prune --omit=dev

# ---------------------------------------------------------------------------
# Runtime stage: unprivileged user, data volume, health check.
# ---------------------------------------------------------------------------
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data

RUN groupadd --system netword && useradd --system --gid netword netword

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.ts /app/next.config.ts /app/tsconfig.json /app/package.json ./

RUN mkdir -p /app/data && chown -R netword:netword /app
USER netword

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
