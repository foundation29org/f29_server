# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build — Node 22 Alpine
# Frontend (Angular/SWA) is deployed separately; this image only serves the API.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install production dependencies ──────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: final runtime image ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

COPY --from=deps /app/node_modules ./node_modules
# Copy everything — .dockerignore handles exclusions
COPY . .

USER nodeuser

ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
