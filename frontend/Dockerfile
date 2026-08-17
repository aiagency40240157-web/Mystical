# ── Build stage: Next.js static export ──────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Frontend calls the API on the same origin; Caddy proxies /api → backend.
# Baked at build time (NEXT_PUBLIC_* are compile-time in Next.js).
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build

# ── Serve stage: Caddy serves the static site + reverse-proxies /api ─────────
FROM caddy:2-alpine

# Static export output goes to /srv; Caddyfile is mounted at runtime.
COPY --from=builder /app/out /srv
