# Guía de seguridad — Spa Software

Lista práctica de qué está implementado y qué debes verificar antes de exponer la app a internet.

## Lo que YA hace el código

### Autenticación
- **JWT** firmado con `HS256` + `issuer`/`audience` fijos; el verificador rechaza tokens con otro `alg` (evita el ataque `alg=none`).
- **`tokenVersion`** por usuario: bumping invalida instantáneamente todos los tokens emitidos (logout global, cambio de contraseña).
- **Bcrypt cost 12** para los hashes de contraseña.
- **Bloqueo de cuenta** tras 5 intentos fallidos durante 15 min.
- **Anti-timing/anti-enum** en login: cuando el email no existe igual se ejecuta una comparación contra un hash dummy para no filtrar la existencia del usuario por tiempo de respuesta.
- **Política de contraseñas** en `/auth/change-password`: mínimo 10 chars + mayúscula + minúscula + número.
- **Logout global** disponible vía `POST /api/auth/logout`.

### Rate limiting
- Capa global: 200 req/min por IP.
- Login: 10 intentos/15 min con clave compuesta `IP + email` (frena ataques distribuidos a una misma cuenta).
- Creación pública de reservas: 30 req/min.

### Inputs
- Todos los endpoints usan `zod` para validar y `sanitizeText()` para normalizar strings (quita control chars, escapa `<>`, limita longitud).
- `phone` se reduce a sólo dígitos (7–15) antes de guardarse.
- `email` se normaliza a minúsculas y trim.
- IDs validados como `cuid` (no se aceptan paths arbitrarios).
- `slug` con regex estricto.

### Reservas
- Validación de horario: antelación mínima 30 min, máximo 180 días a futuro, dentro de horario de atención (08:00–21:00 por defecto).
- Detección de conflictos: no se puede reservar un slot que se solape con otra reserva activa.
- Precio "fijado" al momento de reservar (no se puede manipular cliente-side).

### Pagos (Stripe)
- Webhook verifica firma con `stripe.webhooks.constructEvent`. Cualquier fallo se loguea en `SecurityEvent`.
- Comparación de monto: si el total recibido por Stripe no coincide con el `Payment` guardado, se rechaza el evento.
- Idempotencia: si la reserva ya estaba `PAID`, el webhook responde 200 sin reprocesar.
- Sesiones de Checkout expiran a los 30 min.
- Soporte para `charge.refunded` → marca `Payment.status = REFUNDED`.

### Uploads de imagen
- Sólo JPG/PNG/WebP, **verificado por magic bytes** (no por el `Content-Type` declarado).
- Tamaño máximo: 3 MB.
- Nombre del archivo aleatorio (16 bytes hex) — nunca se usa el nombre del usuario (path traversal, ejecución por extensión).
- Path normalizado y confinado a `UPLOAD_DIR` antes de escribir.
- Estáticos servidos con `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: cross-origin`, CSP `default-src 'none'`, y `Content-Type` forzado por extensión.
- Sólo admins autenticados pueden subir (`requireAuth`).

### URLs de imagen externa
- Whitelist de hosts (`unsplash`, `cloudinary`, `imgur`, etc.). Otros hosts se rechazan en validación.
- Sólo `https://`. Se rechazan IPs literales (anti-SSRF básico).
- `ALLOWED_IMAGE_HOSTS` permite añadir hosts adicionales por env.

### Headers HTTP (helmet)
- **CSP** estricto: `default-src 'self'`, scripts solo propios, frames sólo de Stripe.
- **HSTS** activado en producción (`max-age=1 año`, `includeSubDomains`, `preload`).
- `X-Powered-By` deshabilitado.
- `Referrer-Policy: strict-origin-when-cross-origin`.

### CORS
- Lista blanca explícita desde `CORS_ORIGIN`. **Producción rechaza `*`** (la app sale con error si lo detecta).

### Auditoría
- Tabla `SecurityEvent` registra: `LOGIN_FAILED`, `LOGIN_SUCCESS`, `ACCOUNT_LOCKED`, `TOKEN_INVALID`, `RATE_LIMITED`, `WEBHOOK_INVALID_SIG`, `WEBHOOK_OK`, `UPLOAD_REJECTED`, `FORBIDDEN_ACCESS`. Incluye IP, user-agent y metadata.

### Otros
- `trust proxy` configurable por env (clave para que el rate limit funcione bien detrás de Vercel/Render/Nginx).
- Límite de body JSON configurable (`MAX_BODY_KB`, default 256 KB).
- `JWT_SECRET` validado al arranque: mínimo 32 chars; warning si <48 en producción.
- Validación de env al arranque: si falta algo crítico el proceso no arranca.

---

## Lo que TÚ debes hacer antes de exponer a internet

### Imprescindible
- [ ] Generar `JWT_SECRET` real (>= 48 chars). En PowerShell:
  ```powershell
  [Convert]::ToBase64String((1..48 | %{[byte](Get-Random -Max 256)}))
  ```
- [ ] Cambiar la contraseña de `admin@spa.local` (o crear otro admin) y eliminar/cambiar el demo.
- [ ] `NODE_ENV=production` en el servidor.
- [ ] `CORS_ORIGIN` con el dominio EXACTO de la web (sin barra final), por ejemplo `https://app.tuspa.com`.
- [ ] HTTPS obligatorio. Detrás de Vercel/Render esto viene gratis; en VPS usa Caddy o un certificado Let's Encrypt + nginx.
- [ ] Backups automáticos de PostgreSQL (en Neon/Supabase ya vienen; en VPS programa `pg_dump`).
- [ ] **Stripe en modo Live**: cambia `STRIPE_SECRET_KEY` por `sk_live_...` y crea el webhook real en el dashboard → URL `https://tu-api.com/api/payments/webhook`, evento `checkout.session.completed` (mínimo) y `checkout.session.expired`, `charge.refunded`. Copia el `whsec_...` real.
- [ ] DB con SSL: en producción usa `?sslmode=require` en `DATABASE_URL`.
- [ ] Variables `.env` NUNCA commiteadas (revisar `.gitignore` — ya está). Usa el panel de variables de tu proveedor.

### Recomendado
- [ ] **Monitoreo de errores**: integra Sentry (`@sentry/node` en API, `@sentry/nextjs` en web).
- [ ] **Logs centralizados**: Logtail, Better Stack, o lo que use tu PaaS.
- [ ] **Rotación periódica de `JWT_SECRET`** (al rotarlo todos los usuarios deben hacer login de nuevo).
- [ ] **2FA para admins**: hoy no está; si lo necesitas añade TOTP con `otplib`.
- [ ] **Reverse proxy con WAF** (Cloudflare delante, por ejemplo).
- [ ] **Política de retención de `SecurityEvent`**: agenda un cron para borrar eventos > 90 días.
- [ ] **DKIM/SPF** correctos en el dominio del MAIL_FROM para que los emails no caigan a spam.
- [ ] Revisar `SecurityEvent` periódicamente, especialmente `WEBHOOK_INVALID_SIG` y `RATE_LIMITED`.
- [ ] **Pen-test ligero**: corre `npm audit` y revisa con `snyk test` antes de cada release.
- [ ] Si subes uploads a producción: NO uses disco local en plataformas con sistemas de archivos efímeros (Vercel, Render free, Cloud Run sin volumen). Migra a **S3 / Cloudinary / R2** y actualiza `uploads.ts` para usar `@aws-sdk/client-s3`.

### Si manejas datos médicos / información sensible
- [ ] **No** uses este código para PHI (datos de salud) sin agregar cifrado en reposo de campos sensibles, política de auditoría y cumplir HIPAA/GDPR según jurisdicción. El stack está pensado para **información de contacto y reservas**, no historiales médicos.

---

## Reportar vulnerabilidades

Si encuentras un fallo de seguridad, **no abras un issue público**. Escribe a `security@tudominio.com` con detalles, pasos para reproducir e impacto.
