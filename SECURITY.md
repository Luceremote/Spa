# Seguridad

Documento de referencia sobre los controles de seguridad implementados y la lista de verificación previa a un despliegue en producción.

## Controles implementados

### Autenticación

- JWT firmado con `HS256`, `issuer` y `audience` fijos. El verificador rechaza tokens con otro `alg` (mitiga el ataque `alg=none`).
- Campo `tokenVersion` por usuario: al incrementarse invalida instantáneamente todos los JWT emitidos previamente (logout global y rotación tras cambio de contraseña).
- Hashing de contraseñas con bcrypt `cost=12`.
- Bloqueo automático de cuenta tras 5 intentos fallidos durante 15 minutos.
- Mitigación de timing/enumeration: comparación contra un hash dummy cuando el email no existe.
- Política de contraseñas en `/auth/change-password`: mínimo 10 caracteres con mayúscula, minúscula y número.
- Endpoint `POST /auth/logout` para invalidar todas las sesiones del usuario.

### Rate limiting

- Capa global por IP: 200 req/min.
- Login: 10 intentos cada 15 min con clave compuesta `IP + email`.
- Creación pública de reservas: 30 req/min por IP.

### Validación de entrada

- Todos los endpoints validan el payload con `zod`.
- `sanitizeText()` aplica normalización: quita caracteres de control, escapa `<` y `>`, limita longitud.
- Los teléfonos se reducen a dígitos (7–15) antes de almacenarse.
- Los emails se normalizan en minúsculas con `trim`.
- Los identificadores se validan como `cuid` (no se aceptan paths arbitrarios).
- Los slugs siguen un regex estricto.

### Reservas

- Antelación mínima configurable (30 min por defecto), tope de 180 días a futuro.
- Validación de horario de atención (08:00–21:00 por defecto).
- Detección de conflictos: una reserva no puede solaparse con otra activa para el mismo profesional.
- El precio se fija al momento de crear la reserva (no manipulable desde el cliente).
- Respeto de los días marcados como cerrados en `ClosedDate`.

### Pagos (Stripe)

- Verificación de firma en el webhook con `stripe.webhooks.constructEvent`.
- Comparación de monto: si el total recibido no coincide con el `Payment` registrado, el evento se rechaza.
- Idempotencia: si una reserva ya está `PAID`, el webhook responde 200 sin reprocesar.
- Sesiones de Checkout con expiración de 30 minutos.
- Manejo del evento `charge.refunded` → marca el pago como `REFUNDED`.

### Uploads de imagen

- Sólo se aceptan JPG, PNG y WebP, verificados por **magic bytes** (no se confía en el header `Content-Type` declarado).
- Tamaño máximo: 3 MB.
- Nombre del archivo aleatorio (16 bytes hex). No se reutiliza el nombre del usuario.
- Path normalizado y confinado al directorio de uploads (mitigación de path traversal).
- Estáticos servidos con `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: cross-origin`, CSP `default-src 'none'` y `Content-Type` forzado por extensión.
- Endpoint protegido con `requireAuth` (sólo admins autenticados pueden subir).

### URLs de imagen externa

- Whitelist de hosts permitidos (Unsplash, Cloudinary, Imgur, Pixabay, Pexels, Google Storage). Otros hosts se rechazan en validación.
- Sólo se permite `https://`.
- Se rechazan IPs literales (mitigación básica de SSRF).
- Configurable con `ALLOWED_IMAGE_HOSTS`.

### Headers HTTP (Helmet)

- CSP estricto: `default-src 'self'`, scripts sólo del mismo origen, frames sólo de Stripe.
- HSTS activado en producción (`max-age=1 año`, `includeSubDomains`, `preload`).
- `X-Powered-By` deshabilitado.
- `Referrer-Policy: strict-origin-when-cross-origin`.

### CORS

- Whitelist explícita desde `CORS_ORIGIN`. En producción se rechaza el valor `*` (el proceso aborta al arranque si lo detecta).

### Auditoría

La tabla `SecurityEvent` registra eventos relevantes con IP, user-agent y metadata. Tipos: `LOGIN_FAILED`, `LOGIN_SUCCESS`, `ACCOUNT_LOCKED`, `TOKEN_INVALID`, `RATE_LIMITED`, `WEBHOOK_INVALID_SIG`, `WEBHOOK_OK`, `UPLOAD_REJECTED`, `FORBIDDEN_ACCESS`.

### Operacional

- `trust proxy` configurable por env (necesario para que el rate limit funcione correctamente detrás de proxies como Vercel, Render o Nginx).
- Límite de body JSON configurable (`MAX_BODY_KB`, 256 KB por defecto).
- Validación de `JWT_SECRET` al arranque (mínimo 32 caracteres; warning si es menor a 48 en producción).
- Cron diario de purga de `SecurityEvent` con más de 90 días.

## Lista de verificación previa al despliegue

### Imprescindible

- [ ] `JWT_SECRET` de al menos 48 caracteres, generado aleatoriamente.
- [ ] Cambiar la contraseña del usuario admin por defecto o crear uno nuevo y eliminar el de demo.
- [ ] `NODE_ENV=production`.
- [ ] `CORS_ORIGIN` con el dominio exacto del frontend (sin barra al final).
- [ ] HTTPS obligatorio en el dominio público.
- [ ] Backups automáticos de PostgreSQL configurados.
- [ ] Stripe en modo Live (`sk_live_...`) con webhook real registrado en el dashboard.
- [ ] `DATABASE_URL` con SSL (`?sslmode=require`).
- [ ] Ningún archivo `.env` con secretos commiteado en git.

### Recomendado

- [ ] Monitoreo de errores (Sentry o equivalente).
- [ ] Logs centralizados.
- [ ] Rotación periódica de `JWT_SECRET`.
- [ ] 2FA activado para todos los usuarios administradores.
- [ ] Reverse proxy con WAF (por ejemplo, Cloudflare).
- [ ] Política de retención automática para `SecurityEvent` (ya viene activa con `ENABLE_CRON=true`).
- [ ] DKIM y SPF correctamente configurados en el dominio del `MAIL_FROM`.
- [ ] Revisión periódica de la tabla `SecurityEvent`, en particular los tipos `WEBHOOK_INVALID_SIG` y `RATE_LIMITED`.
- [ ] Ejecutar `npm audit` antes de cada release.
- [ ] Si se despliega en una plataforma con sistema de archivos efímero (Vercel, Render free, Cloud Run sin volumen), usar storage S3-compatible para los uploads.

### Datos sensibles

El stack está diseñado para información de contacto y reservas. Para manejar PHI (datos de salud) u otros datos regulados, se requiere añadir cifrado en reposo de los campos sensibles, política de auditoría adicional y cumplir la normativa aplicable (HIPAA, GDPR, etc.).

## Reporte de vulnerabilidades

Reportes responsables: contactar al mantenedor del proyecto en privado, no abrir issues públicos con detalles de la vulnerabilidad.
