# syntax=docker/dockerfile:1.7
# BuildKit включён по умолчанию в Docker >= 20.10. Если на сервере docker старше,
# либо BUILDKIT отключён — установите DOCKER_BUILDKIT=1 перед `docker build`.

# ============================================
# Stage 1: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

# npm cache между билдами — на повторных запусках npm ci становится почти мгновенным
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Поднято с 1536 — иначе TS/webpack-воркеры падают по OOM и ретраятся (видно в логах "Retrying 1/3")
ENV NODE_OPTIONS="--max-old-space-size=2048"

# .next/cache между билдами — повторная компиляция использует кешированные модули и Module Federation
RUN --mount=type=cache,target=/app/.next/cache npx next build --webpack

# ============================================
# Stage 2: Production runner
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Public assets
COPY --from=builder /app/public ./public

# Standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
