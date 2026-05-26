# Dockerfile standalone para el API.
# NO usa workspaces de pnpm — copia solo apps/api/ e instala con npm directo.
# Render lo encuentra via render.yaml (dockerfilePath + dockerContext=.)

# ─── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# OpenSSL: Prisma lo necesita para los engines en Alpine
RUN apk add --no-cache openssl

# Copiar manifests del API
COPY apps/api/package.json ./

# Instalar TODAS las deps (incluye devDeps: tsx, typescript, prisma CLI, @types/*)
RUN npm install --no-audit --no-fund --loglevel=error

# Código fuente del API
COPY apps/api/tsconfig.json ./
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src

# Generar Prisma client + compilar TS
RUN npx prisma generate && npx tsc -p tsconfig.json

# ─── Stage 2: runtime ────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# OpenSSL también en runtime (Prisma engines lo cargan al arrancar)
RUN apk add --no-cache openssl

# Re-instalar SOLO deps de producción
COPY apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

# Copiar artefactos del build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Prisma client generado (incluye binarios linux-musl-openssl-3.0.x)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# CLI de prisma (es devDep, pero la necesitamos en runtime para `migrate deploy`)
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Usuario non-root + ownership completo de /app para que prisma pueda escribir
RUN mkdir -p /app/uploads && \
    addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Aplica migraciones pendientes (idempotente) y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
