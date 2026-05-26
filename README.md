# Spa Software

Plataforma completa para gestión de spa:

- **Web pública** para clientes: landing, menú de servicios, reservas, pagos con tarjeta.
- **Panel admin** para el dueño: calendario, dashboard de ganancias, CRUD servicios, clientes y personalización completa del tema.
- **App móvil** (iOS + Android) con tema sincronizado en vivo desde el panel.
- **Pagos** con Stripe (USD, crédito/débito).
- **WhatsApp** integrado (botón flotante + deep link).

## Stack

| Pieza    | Tecnología                                                    |
| -------- | ------------------------------------------------------------- |
| Monorepo | pnpm workspaces                                               |
| API      | Node 20 + Express + TypeScript + Prisma + PostgreSQL          |
| Web      | Next.js 14 (App Router) + Tailwind + shadcn-style             |
| Móvil    | Expo SDK 51 + React Native + expo-router                      |
| Pagos    | Stripe Checkout + webhook con verificación de firma           |
| Email    | Resend (3k emails/mes gratis)                                 |

## Estructura

```text
spa-software/
├── apps/
│   ├── api/      # Backend Express + Prisma + Stripe + uploads + emails
│   ├── web/      # Next.js: cliente público + admin (mismo deploy)
│   └── mobile/   # Expo: app iOS/Android con tema dinámico
├── SECURITY.md   # Guía de seguridad: qué hace el código y qué debes hacer tú
├── DEPLOY.md     # Guía de despliegue a producción
└── README.md     # Este archivo
```

## Setup local

### 1) Requisitos

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- PostgreSQL local **o** en la nube ([Neon](https://neon.tech) free funciona perfecto)
- (Opcional) [Stripe CLI](https://stripe.com/docs/stripe-cli) para webhooks en local

### 2) Variables de entorno

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
copy apps\mobile\.env.example apps\mobile\.env
```

Edita las copias:

- `apps/api/.env` → `DATABASE_URL`, `JWT_SECRET` (>=32 chars), y opcionalmente Stripe + Resend.
- `apps/web/.env.local` → `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api`).
- `apps/mobile/.env` → `EXPO_PUBLIC_API_URL` (en dispositivo físico usa tu IP LAN).

### 3) Instalar

```powershell
pnpm install
```

### 4) Base de datos

```powershell
pnpm db:migrate   # crea tablas
pnpm db:seed      # admin demo + 7 servicios + tema default
```

Admin demo: `admin@spa.local` / `admin123` (cambia esto antes de producción).

### 5) Levantar

```powershell
pnpm dev          # API en :4000 + Web en :3000
```

- Web pública: <http://localhost:3000>
- Panel admin: <http://localhost:3000/admin>
- API: <http://localhost:4000/api/health>

### 6) Móvil (opcional)

```powershell
cd apps\mobile
pnpm dev
# Escanea el QR con Expo Go en tu teléfono
```

## Features destacados

### Cliente público

- Landing con 4 plantillas (elegant, modern, minimal, luxury) — el admin elige
- Menú de servicios con filtros por categoría
- Detalle de servicio con CTA reservar
- Flujo de reserva de 3 pasos: servicio → fecha/hora → datos → pago
- Pago con tarjeta (Stripe Checkout) o "pagar en sitio"
- Botón flotante de WhatsApp en todas las pantallas

### Panel admin

- Dashboard con ganancias del mes/hoy, gráfica de 6 meses, próximas reservas, top servicios
- Calendario mensual de citas con click-to-edit (confirmar/cancelar/completar/no-show)
- CRUD de servicios con upload de imágenes (JPG/PNG/WebP, verificado por magic bytes)
- Lista/búsqueda de clientes con historial de reservas
- **Personalización en vivo**: 6 paletas preset + color picker, radio de bordes, padding, ancho de contenedor, fuente, plantilla — preview en tiempo real antes de guardar
- Configuración del sitio: nombre, logo, hero, WhatsApp, dirección, horario, email

### App móvil

- Misma experiencia que la web: home, servicios, detalle, reserva, contacto
- Tema dinámico desde el panel admin (se cachea en AsyncStorage para arranque offline)
- Pull-to-refresh para sincronizar tema/servicios
- Pago abre Stripe Checkout en navegador in-app

### Seguridad

- JWT con `issuer`/`audience`/`alg` fijos + `tokenVersion` para logout global
- Bcrypt cost 12 + lockout de cuenta (5 intentos / 15 min)
- Rate limiting granular (global + login con IP+email + reservas)
- CSP estricto + HSTS + CORS whitelist
- Sanitización de inputs + validación zod + magic bytes en uploads
- Whitelist de hosts para imágenes externas (anti-SSRF)
- Webhook Stripe con verificación de firma + comparación de monto
- Auditoría de eventos de seguridad en tabla `SecurityEvent`

→ Detalles completos en [`SECURITY.md`](./SECURITY.md).

## Despliegue

→ Ver [`DEPLOY.md`](./DEPLOY.md) (incluye Railway, Render, Vercel, EAS).

## Scripts disponibles

```powershell
pnpm dev               # api + web en paralelo
pnpm dev:api           # solo api
pnpm dev:web           # solo web
pnpm build             # build de todos
pnpm db:migrate        # nuevas migraciones
pnpm db:seed           # datos de prueba
pnpm db:studio         # GUI de Prisma para inspeccionar DB
```

## Roadmap sugerido (siguientes pasos)

- [ ] 2FA para admins (TOTP con `otplib`)
- [ ] Notificaciones push (Expo Push) recordando cita 1h antes
- [ ] Cupones / códigos de descuento
- [ ] Programa de fidelización (puntos por reserva)
- [ ] Multi-staff / asignación de profesional a la reserva
- [ ] Storage S3/R2 para uploads (necesario si despliegas en plataformas con FS efímero)
- [ ] Migraciones automatizadas en CI
