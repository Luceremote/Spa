# Despliegue en producción

Esta guía describe el despliegue recomendado en infraestructura gestionada con plan gratuito o de bajo costo.

## Arquitectura

```text
┌────────────┐    ┌─────────────┐    ┌──────────────┐
│  Vercel    │───▶│  Render     │───▶│  Neon        │
│  (web)     │    │  (API)      │    │  PostgreSQL  │
└────────────┘    └─────────────┘    └──────────────┘
                         │                  ▲
                         ▼                  │ webhook
                  ┌──────────────┐   ┌─────────────┐
                  │  Cloudflare  │   │   Stripe    │
                  │  R2 (imgs)   │   └─────────────┘
                  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Resend     │
                  │   (emails)   │
                  └──────────────┘
```

App móvil: **EAS Build** (Expo) para Play Store y App Store.

---

## 1. Base de datos: Neon

[Neon](https://neon.tech) ofrece PostgreSQL gestionado con plan free generoso (3 GB).

1. Crear proyecto y copiar el connection string (con `?sslmode=require`).
2. Pegar en `apps/api/.env` como `DATABASE_URL`.
3. Aplicar migraciones desde local:

   ```powershell
   pnpm db:migrate
   pnpm db:seed
   ```

## 2. Backend API: Render

El repositorio incluye `render.yaml` (Blueprint) y `apps/api/Dockerfile`.

1. Cuenta en <https://render.com>, conectar GitHub.
2. **New** → **Blueprint** → seleccionar el repositorio.
3. Render leerá `render.yaml` y creará el servicio `spa-api` automáticamente.
4. En la pestaña **Environment** del servicio, definir todas las variables marcadas como `sync: false` (DATABASE_URL, JWT_SECRET, claves S3, Stripe, etc.).
5. El primer build tarda ~5 minutos. Cuando el servicio esté en estado **Live**, la URL pública aparece en la cabecera del servicio (ejemplo: `https://spa-api-XXXX.onrender.com`).

> El plan free de Render duerme el servicio tras 15 minutos sin tráfico. Para producción real, contratar el plan `Starter` ($7/mes) que evita el cold start.

## 3. Frontend web: Vercel

1. Cuenta en <https://vercel.com>, **Add New** → **Project**.
2. Importar el repositorio.
3. **Configure Project**:
   - **Framework Preset**: Next.js (autodetectado).
   - **Root Directory**: `apps/web`.
   - Variable de entorno:
     - `NEXT_PUBLIC_API_URL` = `https://<URL-de-Render>/api`
4. **Deploy**.
5. Cuando finalice, copiar la URL pública (formato `https://<proyecto>.vercel.app`).
6. Volver a Render y actualizar:
   - `CORS_ORIGIN` = URL de Vercel
   - `APP_URL` = URL de Vercel

## 4. Storage de imágenes: Cloudflare R2

R2 es compatible con la API S3 y ofrece 10 GB gratis sin cargos por transferencia.

1. Cuenta en <https://dash.cloudflare.com>, activar R2.
2. **Create bucket** (por ejemplo `spa-uploads`).
3. En el bucket → **Settings** → **Public Access** → habilitar **R2.dev subdomain** y copiar la URL pública.
4. **R2** → **API Tokens** → **Create API Token** con permisos *Object Read & Write* sobre el bucket. Copiar:
   - Access Key ID
   - Secret Access Key
   - Endpoint S3
5. Configurar las variables en Render:

   ```env
   STORAGE_DRIVER=s3
   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=spa-uploads
   S3_ACCESS_KEY=<access-key>
   S3_SECRET_KEY=<secret-key>
   S3_PUBLIC_URL=https://pub-<id>.r2.dev
   ALLOWED_IMAGE_HOSTS=pub-<id>.r2.dev
   ```

## 5. Pagos Stripe (modo Live)

1. Activar la cuenta en <https://dashboard.stripe.com>, completar verificación KYC.
2. **Developers** → **API keys** → copiar `sk_live_...`.
3. **Developers** → **Webhooks** → **Add endpoint**:
   - URL: `https://<URL-de-Render>/api/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`
4. Copiar el *Signing secret* (`whsec_...`).
5. Actualizar en Render:

   ```env
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Pruebas locales con Stripe CLI

```powershell
stripe login
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copiar el `whsec_...` que muestra el comando y pegarlo en `apps/api/.env`.

## 6. Emails: Resend

1. Cuenta en <https://resend.com> (3000 emails/mes gratis).
2. **Domains** → añadir el dominio y configurar los registros DNS (SPF, DKIM, DMARC) que indica el panel.
3. **API Keys** → crear una nueva.
4. Configurar en Render:

   ```env
   RESEND_API_KEY=re_...
   MAIL_FROM=Spa <reservas@tudominio.com>
   ADMIN_EMAIL=admin@tudominio.com
   ```

## 7. App móvil: EAS Build

### Desarrollo (sin compilar)

```powershell
cd apps\mobile
# Editar .env con la IP LAN del PC, no localhost
pnpm dev
# Escanear el QR desde Expo Go en el teléfono
```

### Build para tiendas

```powershell
npm install -g eas-cli
cd apps\mobile
eas login
eas build:configure
# Ajustar bundleIdentifier (iOS) y package (Android) en app.json
# Definir EXPO_PUBLIC_API_URL apuntando al API de producción
eas build --platform all
eas submit --platform all
```

---

## Lista de verificación previa al lanzamiento

- [ ] `NODE_ENV=production` en el API
- [ ] `JWT_SECRET` aleatorio, >= 48 caracteres
- [ ] Usuario admin con contraseña fuerte; eliminado el de demo
- [ ] `CORS_ORIGIN` con el dominio exacto del frontend (sin barra final)
- [ ] Stripe en modo Live, webhook registrado y `STRIPE_WEBHOOK_SECRET` correcto
- [ ] DNS configurado, HTTPS activo
- [ ] `DATABASE_URL` con `sslmode=require`
- [ ] Backups automáticos verificados
- [ ] Monitoreo de errores configurado
- [ ] Dominio del `MAIL_FROM` verificado en Resend (DKIM/SPF correctos)
- [ ] Prueba de reserva end-to-end con tarjeta real
- [ ] Revisado [`SECURITY.md`](./SECURITY.md)
