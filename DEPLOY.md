# Guía de despliegue — Spa Software

Opciones sugeridas y pasos concretos.

## Arquitectura recomendada

```
┌────────────┐    ┌─────────────┐    ┌──────────────┐
│  Vercel    │    │  Railway/   │    │  Neon /      │
│  (web)     │───▶│  Render     │───▶│  Supabase    │
│  Next.js   │    │  (API)      │    │  PostgreSQL  │
└────────────┘    └─────────────┘    └──────────────┘
       │                  ▲
       │ Stripe           │ webhook
       └─────────────────▶│
                          ▼
                  ┌──────────────┐
                  │   Resend     │
                  │   (emails)   │
                  └──────────────┘
```

App móvil: **EAS Build** (Expo) → Play Store + App Store.

---

## 1) Base de datos PostgreSQL

**Opción más simple gratis**: [Neon](https://neon.tech) (3 GB en plan free).

1. Crea el proyecto, copia el `DATABASE_URL` con `?sslmode=require`.
2. Localmente: edita `apps/api/.env` con ese `DATABASE_URL` y ejecuta:
   ```powershell
   pnpm db:migrate
   pnpm db:seed
   ```

## 2) Backend API

### Opción A — Railway (más fácil)
1. Crea proyecto y conecta tu repo.
2. Settings → Root Directory: `apps/api`.
3. Build command: `pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build`.
4. Start command: `pnpm prisma:deploy && node dist/server.js`.
5. Pestaña Variables: pega TODAS las del `.env.example` con valores reales.
6. Genera dominio público en Settings → Networking.

### Opción B — Render
- "New Web Service" → Build: `pnpm install && pnpm prisma:generate && pnpm build`.
- Start: `pnpm prisma:deploy && node dist/server.js`.
- Health check path: `/api/health`.

### Opción C — Docker + VPS
Crea `apps/api/Dockerfile`:
```Dockerfile
FROM node:20-alpine
WORKDIR /app
RUN npm i -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api ./apps/api
RUN pnpm install --filter @spa/api --frozen-lockfile
WORKDIR /app/apps/api
RUN pnpm prisma:generate && pnpm build
EXPOSE 4000
CMD ["sh","-c","pnpm prisma:deploy && node dist/server.js"]
```
Despliega con Caddy/nginx delante (HTTPS).

## 3) Web (Next.js)

Vercel:
1. Importa el repo, en "Root Directory" pon `apps/web`.
2. Build: `pnpm install --frozen-lockfile && pnpm build`.
3. Variables:
   - `NEXT_PUBLIC_API_URL=https://tu-api.railway.app/api`
   - `NEXT_PUBLIC_APP_URL=https://app.tudominio.com`
4. En tu API, añade el dominio de Vercel a `CORS_ORIGIN`.

## 4) Stripe Live

1. Activa tu cuenta en https://dashboard.stripe.com (modo Live).
2. Developers → API keys → copia `sk_live_...`.
3. Webhooks → Add endpoint:
   - URL: `https://tu-api.railway.app/api/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. Copia el "Signing secret" (`whsec_...`).
5. Variables en el API:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   APP_URL=https://app.tudominio.com
   ```

### Testear webhook localmente
```powershell
# Instala Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
# copia el whsec_... que muestra y pégalo en apps/api/.env
```

## 5) Emails (Resend)

1. Crea cuenta en https://resend.com (3 000 emails/mes gratis).
2. Domains → Add domain → sigue las instrucciones DNS (SPF, DKIM, DMARC).
3. API Keys → crea una.
4. Variables en el API:
   ```
   RESEND_API_KEY=re_xxx
   MAIL_FROM=Spa <reservas@tudominio.com>
   ADMIN_EMAIL=admin@tudominio.com
   ```

## 6) App móvil (Expo)

### Desarrollo (sin build, ver en tu teléfono)
```powershell
cd apps/mobile
# Cambia EXPO_PUBLIC_API_URL en .env a la IP LAN de tu PC (no localhost)
# Ejemplo: EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api
pnpm dev
# Escanea el QR con la app Expo Go
```

### Producción (Play Store / App Store)
```powershell
npm install -g eas-cli
cd apps/mobile
eas login
eas build:configure
# Edita app.json: bundleIdentifier y package únicos
# Apunta EXPO_PUBLIC_API_URL a tu API en producción
eas build --platform all
eas submit --platform all
```

---

## Checklist final pre-launch

- [ ] `NODE_ENV=production` en el API
- [ ] `JWT_SECRET` largo y rotado (>=48 chars)
- [ ] Admin demo eliminado o con contraseña cambiada
- [ ] `CORS_ORIGIN` con el dominio exacto (sin `*`)
- [ ] Stripe en modo Live
- [ ] Webhook de Stripe registrado y `STRIPE_WEBHOOK_SECRET` real
- [ ] DNS apuntando, HTTPS funcionando
- [ ] DB con SSL (`?sslmode=require`)
- [ ] Backups configurados
- [ ] Logs/monitoreo activo (Sentry recomendado)
- [ ] Emails: dominio verificado en Resend (DKIM/SPF OK)
- [ ] Probada una reserva real end-to-end (con tarjeta de prueba `4242 4242 4242 4242` antes de pasar a Live)
- [ ] `SECURITY.md` revisado al detalle

Lee también [`SECURITY.md`](./SECURITY.md) para la lista completa de checks de seguridad.
