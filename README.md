# Spa Software

Plataforma para gestión integral de un spa: reservas online, pagos con tarjeta, panel de administración, app móvil y personalización del sitio en vivo.

## Stack

| Pieza    | Tecnología                                                    |
| -------- | ------------------------------------------------------------- |
| Monorepo | pnpm workspaces                                               |
| API      | Node 20 + Express + TypeScript + Prisma + PostgreSQL          |
| Web      | Next.js 14 (App Router) + Tailwind CSS                        |
| Móvil    | Expo SDK 51 + React Native + expo-router                      |
| Pagos    | Stripe Checkout + webhook con verificación de firma           |
| Email    | Resend                                                        |
| Storage  | S3-compatible (AWS S3 / Cloudflare R2 / MinIO) o disco local  |

## Estructura

```text
spa-software/
├── apps/
│   ├── api/      # Backend Express + Prisma + Stripe + uploads + emails
│   ├── web/      # Next.js: cliente público + admin
│   └── mobile/   # Expo: app iOS / Android
├── render.yaml   # Blueprint de despliegue para Render
└── apps/web/vercel.json
```

## Setup local

### Requisitos

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- PostgreSQL local o gestionado (Neon, Supabase, Railway)

### Variables de entorno

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
copy apps\mobile\.env.example apps\mobile\.env
```

Editar las copias:

- `apps/api/.env` — `DATABASE_URL`, `JWT_SECRET` (>= 32 chars), Stripe y Resend opcionales.
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:4000/api`).
- `apps/mobile/.env` — `EXPO_PUBLIC_API_URL` (IP LAN del PC para dispositivo físico).

### Instalación

```powershell
pnpm install
pnpm db:migrate    # aplica migraciones
pnpm db:seed       # datos de ejemplo
pnpm dev           # arranca API (:4000) + Web (:3000)
```

URLs:

- Sitio público: <http://localhost:3000>
- Panel admin: <http://localhost:3000/admin>
- API: <http://localhost:4000/api/health>

Credenciales del admin de ejemplo: `admin@spa.local` / `admin123` (cambiar en producción).

### App móvil

```powershell
cd apps\mobile
pnpm dev
```

Escanear el QR con la app **Expo Go** desde un dispositivo Android o iOS conectado a la misma red WiFi.

## Funcionalidades

### Sitio público

- Landing personalizable con 4 plantillas (elegante / moderna / minimal / lujo)
- Menú de servicios con filtros por categoría
- Detalle de cada servicio
- Flujo de reserva en 3 pasos: servicio → fecha/hora → datos
- Aplicación de cupones de descuento
- Selección opcional del profesional
- Pago con tarjeta vía Stripe Checkout
- Consulta de reservas anteriores por teléfono
- Botón flotante de WhatsApp

### Panel de administración

- Dashboard con ingresos del mes, gráfica histórica, próximas reservas y top de servicios
- Calendario mensual con gestión de citas (confirmar / completar / cancelar / no-show)
- CRUD de servicios con upload de imágenes
- Gestión de categorías, profesionales, cupones y días cerrados
- Base de clientes con historial
- Personalización del tema en tiempo real (paletas, fuentes, plantilla)
- Configuración del sitio (logo, hero, WhatsApp, dirección, horario)
- Activación de 2FA con TOTP y panel de auditoría
- Export de reservas en CSV

### Aplicación móvil

- Pantallas equivalentes a la web (home, servicios, detalle, reserva, contacto)
- Tema sincronizado desde el admin con caché offline
- Pago integrado mediante navegador in-app
- Notificaciones push opcionales para recordatorios

### Seguridad

- JWT con `issuer`/`audience`/`alg` fijos + `tokenVersion` por usuario
- Bcrypt con cost 12 + bloqueo de cuenta tras 5 intentos fallidos
- Rate limit global, por login (IP + email) y para reservas
- CSP estricto, HSTS, CORS por whitelist
- Sanitización y validación de inputs con Zod
- Magic bytes para validar uploads (no se confía en MIME)
- Webhook de Stripe con verificación de firma y comparación de monto
- 2FA TOTP con secret cifrado en reposo (AES-256-GCM)
- Tabla `SecurityEvent` para auditoría persistente
- Cron de purga automática de eventos > 90 días

Detalles completos en [`SECURITY.md`](./SECURITY.md).

## Despliegue

Ver [`DEPLOY.md`](./DEPLOY.md) para instrucciones de despliegue en Render (API), Vercel (web) y EAS Build (app móvil).

## Scripts

```powershell
pnpm dev               # api + web en paralelo
pnpm dev:api           # solo api
pnpm dev:web           # solo web
pnpm build             # build de todos los workspaces
pnpm db:migrate        # crea/aplica migraciones nuevas
pnpm db:seed           # datos de prueba
pnpm db:studio         # GUI de Prisma para inspeccionar la DB
```
