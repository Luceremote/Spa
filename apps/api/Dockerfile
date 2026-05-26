# Dockerfile multi-stage para el monorepo pnpm.
# Render lo detecta automáticamente cuando se pone "Dockerfile path" en apps/api/Dockerfile.

# ─── Stage 1: deps + build ───────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Instalar pnpm con la versión exacta del lockfile
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# Copiar manifests del root y workspaces (para que pnpm install resuelva todo)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

# Sólo instalamos lo del API (no necesitamos web/mobile en el server)
RUN pnpm install --frozen-lockfile --filter @spa/api...

# Código fuente del API
COPY apps/api ./apps/api

# Generar Prisma client + build TS
WORKDIR /app/apps/api
RUN pnpm prisma:generate && pnpm build

# ─── Stage 2: runtime ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# Copiar lo mínimo para correr
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Crear carpeta de uploads (sólo se usa si STORAGE_DRIVER=local)
RUN mkdir -p /app/apps/api/uploads

# Usuario no-root por seguridad
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app/apps/api/uploads
USER nodejs

WORKDIR /app/apps/api
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Aplica migraciones pendientes y arranca
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/server.js"]
