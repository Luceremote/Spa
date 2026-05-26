# Dockerfile standalone para el API.
# NO usa workspaces de pnpm — copia solo apps/api/ e instala con npm directo.
# Esto evita problemas de memoria al instalar deps de web/mobile que no necesitamos.
# Render lo encuentra via render.yaml (dockerfilePath + dockerContext=.)

# ─── Stage 1: build ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifests del API
COPY apps/api/package.json ./

# Instalar TODAS las deps (necesitamos devDeps como tsx, typescript, @types/* y prisma para el build)
RUN npm install --no-audit --no-fund --loglevel=error

# Código fuente del API
COPY apps/api/tsconfig.json ./
COPY apps/api/prisma ./prisma
COPY apps/api/src ./src

# Generar Prisma client + compilar TS
RUN npx prisma generate && npx tsc -p tsconfig.json

# ─── Stage 2: runtime (más liviano, solo prod deps) ──────────
FROM node:20-alpine AS runner
WORKDIR /app

# Re-instalar SOLO deps de producción para reducir tamaño
COPY apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund --loglevel=error

# Copiar artefactos del build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# Copiar Prisma client ya generado (incluye binarios linux-musl) para no regenerar en runtime
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Carpeta de uploads (solo se usa si STORAGE_DRIVER=local; con R2 no se toca)
RUN mkdir -p /app/uploads && \
    addgroup -S nodejs && adduser -S nodejs -G nodejs && \
    chown -R nodejs:nodejs /app/uploads

USER nodejs
EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Aplica migraciones pendientes (idempotente) y arranca
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
