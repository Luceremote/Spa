# Dockerfile multi-stage para el monorepo pnpm.
# Render lo detecta cuando se pone "Dockerfile path" en apps/api/Dockerfile (configurado en render.yaml).

# ─── Stage 1: deps + build ───────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm via npm (más confiable en CI que corepack en alpine)
RUN npm install -g pnpm@11.3.0

# Copiar manifests del workspace para que pnpm install pueda resolver
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

# Instalar TODAS las deps del monorepo (más fácil que filtrar; pnpm hoistea)
# --ignore-scripts: evita correr prisma generate antes de copiar schema
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar código fuente del API
COPY apps/api ./apps/api

# Generar Prisma client + build TS
WORKDIR /app/apps/api
RUN pnpm prisma:generate && pnpm build

# ─── Stage 2: runtime ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm@11.3.0

# Copiar manifests y node_modules ya resueltos
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules ./node_modules
# Las node_modules específicas del workspace (Prisma client generado, etc.)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Carpeta de uploads (solo se usa si STORAGE_DRIVER=local; en R2 no se toca)
RUN mkdir -p /app/apps/api/uploads && \
    addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app/apps/api/uploads

USER nodejs
WORKDIR /app/apps/api
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Aplica migraciones pendientes y arranca
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/server.js"]
