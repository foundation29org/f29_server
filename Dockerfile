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

# Non-root user for security
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy only what the server needs (no client dist — frontend lives in SWA)
COPY --from=deps /app/node_modules ./node_modules
COPY app.js        ./
COPY index.js      ./
COPY config.js     ./
COPY routes/       ./routes/

# Optional: copy apidoc if you want it served at /apidoc
# COPY apidoc/     ./apidoc/

USER nodeuser

# PORT is read from config.js → process.env.PORT (default 8443)
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["node", "index.js"]
