# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Monorepo for a full spa-management platform:

- **`apps/api`** — Express + Prisma + PostgreSQL (Neon). Public REST + admin REST + Stripe webhook.
- **`apps/web`** — Next.js 14 App Router. Public site at `/` and admin at `/admin`.
- **`apps/mobile`** — Expo SDK 51 + expo-router. Standalone (see "Mobile is outside the pnpm workspace").

Production:

- API on Render (Docker), Web on Vercel, DB on Neon, image storage on Cloudflare R2, payments Stripe, email Resend, push via Expo, errors Sentry.

## Common commands

From repo root (pnpm 9.15+, Node ≥20):

```powershell
pnpm install                # root + api + web (NOT mobile — see below)
pnpm dev                    # api (:4000) + web (:3000) in parallel
pnpm dev:api                # API only
pnpm dev:web                # Web only
pnpm build                  # build all workspace packages
pnpm db:migrate             # prisma migrate dev (interactive — for new migrations)
pnpm db:seed                # seed admin demo + categories + services + gift card + staff
pnpm db:studio              # Prisma Studio GUI

# Type-check per app (no test suite in repo):
cd apps/api && npx tsc --noEmit
cd apps/web && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# DB backup (uses pg_dump; uploads to S3/R2 if env vars set):
bash scripts/backup-db.sh
```

**Creating a new migration in this codebase** — always use `--create-only` so we don't touch Neon prod from a dev machine. Render runs `prisma migrate deploy` on startup and applies the SQL idempotently. The interactive prompt requires piping empty stdin:

```powershell
cd apps/api
echo "" | npx prisma migrate dev --name <slug> --create-only
npx prisma generate
```

**Mobile is outside the pnpm workspace** (`pnpm-workspace.yaml` excludes it). EAS Build ships pnpm 8 which can't read pnpm 9+ lockfiles, so mobile has its own `package-lock.json`:

```powershell
cd apps/mobile
npm install
npm run dev                 # expo start
EAS_NO_VCS=1 eas build --profile preview --platform android   # APK
```

## Architecture

### Backend (`apps/api`)

- ESM TypeScript. Imports use `.js` extensions even for `.ts` files.
- Entry: `src/server.ts` mounts ~25 routers under `/api/*`. Sentry must be the **first** import + init (`initSentry()` at top of server.ts). Mounts the Stripe webhook (`/api/payments/webhook`) **before** `express.json()` because it needs the raw body for signature verification.
- Pattern per feature: `src/routes/<feature>.ts` exports a `Router`. All admin endpoints use `requireAuth`. Many endpoints normalize/sanitize via `src/security/sanitize.ts` (`sanitizeText`, `isAllowedImageUrl`, `normalizeEmail`).
- Auth: JWT HS256 with `issuer`/`audience` fixed and a `tokenVersion` claim. Bumping `User.tokenVersion` invalidates all existing tokens (logout-all, password change, 2FA enable). 2FA flow returns a short-lived `challengeToken` from `/auth/login`; the client posts it to `/2fa/verify` with the TOTP code.
- Storage abstraction (`src/storage.ts`): `STORAGE_DRIVER=local` writes to `./uploads`; `STORAGE_DRIVER=s3` uses `@aws-sdk/client-s3` against any S3-compatible endpoint (Cloudflare R2 in production). `putImage` returns an **absolute** URL when S3 and a **relative** `/uploads/...` when local — frontend handles both (see `uploadImage` in `apps/web/src/lib/api.ts`).
- Uploads (`src/routes/uploads.ts`): multer in-memory + magic-byte sniff (JPG/PNG/WebP only) + random filename + path-confinement check. The declared MIME is never trusted.
- Webhooks (`src/routes/payments.ts`) dispatch `checkout.session.completed` by `session.metadata.type`: `"membership"`/subscription-mode → ack only (state applied by subscription events), `"package"` → `activatePackagePurchase`, `"gift_card"` → `activateGiftCard`, default → booking flow. Also handles `customer.subscription.created/updated/deleted` (→ `applyMembershipSubscription`/`cancelMembershipSubscription`, keyed by `sub.metadata.{customerId,tierId}`) and `charge.refunded`. All branches idempotent. **The Stripe Dashboard webhook endpoint must be subscribed to the `customer.subscription.*` events** or memberships won't sync.
- BNPL (Klarna/Affirm/Afterpay) is a Stripe feature, not a separate processor. When `SiteConfig.enableBnpl` is true, booking + package checkouts use `automatic_payment_methods: { enabled: true }` (Stripe shows whatever methods the account has activated); otherwise `payment_method_types: ["card"]`. Do **not** hard-code the BNPL method list — it errors if the account hasn't activated one. Affirm/Afterpay require a US account + USD.
- Membership subscriptions (`src/routes/memberships.ts`): `/subscribe` creates a subscription-mode Checkout with inline `price_data.recurring` (no pre-created Stripe Prices). `/portal` opens the Stripe billing portal (lookup by phone → `stripeCustomerId`). Deleting a membership in admin does NOT cancel the Stripe sub — the customer cancels via portal.
- Waitlist (`src/routes/waitlist.ts`): public `/` to join; `notifyWaitlistForService(serviceId)` auto-emails the oldest WAITING entries when a booking is cancelled (called from both public `cancel-public` and admin status→CANCELLED).
- Public review photos: `POST /uploads/review-image` (no auth, rate-limited 10/h, same magic-byte sniff as admin). Photos only appear after admin approval (reviews start `published=false`).
- Cron (`src/cron.ts`, `node-cron`, opt-in with `ENABLE_CRON=true`):
  - Every 5 min: push reminder ~`REMINDER_MINUTES_BEFORE` (default 60) before booking; tracks via `Booking.reminderSentAt`.
  - Hourly: email reminder ~24h before booking; tracks via `Booking.emailReminderSentAt`.
  - Daily 6 AM: `processRecurringTransactions` (auto-creates finance entries from `RecurringTransaction`).
  - Monday 10 AM: `sendFollowupBatch` re-engagement for inactive customers (FOLLOWUP_* env vars).
  - Daily 3 AM: delete `SecurityEvent` rows older than 90 days.
- Finance auto-sync (`src/finances-helpers.ts`): on booking paid → `recordBookingIncome`; on gift-card activation → `recordGiftCardIncome`; on package activation → `recordTransaction` with category "Paquetes vendidos"; on `charge.refunded` → `recordRefund`. All idempotent by `source` + linking id. Generic helper `recordTransaction({ type, source, amountCents, categoryName })` auto-creates the FinanceCategory if missing.
- Loyalty (`src/loyalty-helpers.ts`): `earnPointsFromBooking` is called best-effort after a booking is PAID. Idempotent via lookup `LoyaltyMovement {accountId, bookingId, type:"EARN"}`. Account is upserted by `customerId` (unique).
- Re-engagement (`src/followup-helpers.ts`): finds customers with email, no bookings in `FOLLOWUP_INACTIVE_DAYS`, and `lastFollowupAt` older than `FOLLOWUP_COOLDOWN_DAYS` (or null). Sends `followupEmail` from `mail.ts`, then bumps `Customer.lastFollowupAt`.
- Rate limiting: global 200 req/min, login 10/15min keyed by **IP + email** (frustrates distributed brute force), bookings 30/min.
- All cross-cutting security events (`LOGIN_FAILED`, `WEBHOOK_INVALID_SIG`, `UPLOAD_REJECTED`, etc.) go through `src/security/events.ts` → `SecurityEvent` table.
- 5xx errors in the error middleware are captured by Sentry (`src/middleware/error.ts`). Sentry is a no-op if `SENTRY_DSN` is empty (dev).

### Database (Prisma)

- **Singleton rows** (all with `id="singleton"`, helpers upsert on first access): `SiteConfig`, `Theme`, `PromoBanner`, `PromoPopup`, `LoyaltySettings`.
- `Customer` has no unique constraint on `phone`; booking and package-purchase flows do a `findFirst({ where: { phone } })` then upsert manually.
- Reviews require `published=true` to appear on the public site. `featured=true` shows them on the homepage. Subscribers (`Subscriber`) are upserted on (re)subscribe.
- Finance schema: `Transaction` (positive `amountCents` + `type` determines sign), `FinanceCategory` (unique on `[name, type]`), `RecurringTransaction` (drives auto-generation via cron).
- Sales schema: `ServicePackage` (template) → `PackagePurchase` (per customer, with `sessionsRemaining` countdown and `expiresAt`) → `PackageRedemption` (1:1 with Booking when used). `MembershipTier` → `CustomerMembership` (unique on `customerId`, gives discount on every reservation via `getActiveDiscountForCustomer`).
- Marketing schema: `EmailCampaign` (broadcast w/ status state machine DRAFT→SENDING→SENT/FAILED), `PromoBanner` + `PromoPopup` singletons, `LoyaltyAccount`/`LoyaltyMovement`.
- `SiteConfig.navLinks` is a JSON array `[{href, label, visible}]`. The public navbar reads it via `config.navLinks ?? DEFAULT_NAV_LINKS` (from `apps/web/src/components/navbar.tsx`). Admin edits it from `/admin/navegacion`.

### Frontend web (`apps/web`)

- App Router. Public routes live under `src/app/(public)/...`; admin under `src/app/admin/...`. The `(public)` group has its own `layout.tsx` with PromoBannerClient (top) + Navbar + Footer + WhatsAppFab + PromoPopupClient. Admin uses `AdminShell` (client component) with auth check + responsive drawer.
- **Theme/SiteConfig/Banner/Popup fetches must use `{ cache: "no-store" }`** in `src/lib/server-fetch.ts`. Without this, changes from admin are invisible until cache expiry. Other fetches (services, categories, packages, memberships) keep `revalidate`.
- Tailwind config maps CSS vars (`--primary`, `--header`, `--muted`, `--radius`, …). The **client** `ThemeProvider` (`src/components/theme-provider.tsx`) sets those on `document.documentElement` from the DB-stored Theme. Adding a new themeable token requires: schema field → theme router schema → Theme type → `ThemeProvider` set call → `globals.css` default → `tailwind.config.ts` mapping → personalization page ColorRow.
- The Navbar drawer is rendered as a **sibling of `<header>`**, not a child. `<header>` has `backdrop-blur`, which creates a containing block that traps `position: fixed` descendants and makes the drawer invisible. Don't nest them.
- Image upload: `uploadImage` in `src/lib/api.ts` decides whether to prepend `API_BASE` based on whether the returned URL is absolute (S3/R2) or relative (local storage). Don't double-prefix.
- Slugs (services, categories): the slug field auto-normalizes via `slugify` on every keystroke; the API also normalizes server-side. Both sides are tolerant — never reject for case/spaces.
- API helper pattern: use `api("/path", { method, token: getToken() ?? undefined, json: body })`. The `json:` option auto-sets `Content-Type: application/json`; don't manually stringify into `body`.
- **There is no `Badge` UI component** (`src/components/ui/` only has `button`, `card`, `input`, `label`, `textarea`). For status pills use inline `<span className="text-xs font-medium px-2 py-0.5 rounded-full ...">`.
- The Card component does **not** support `asChild`. For card-shaped links use plain `<Link>` with manual classes `rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/40`.
- Markdown links for file references in chat use VSCode-style paths (`[file.ts](src/file.ts)`).

### Frontend mobile (`apps/mobile`)

- expo-router with file-based routing. `app/(tabs)/_layout.tsx` defines bottom tabs; `app/servicio/[slug].tsx` and `app/reservar.tsx` are stack screens.
- Theme is fetched once on mount from API and cached in AsyncStorage. The `ThemeProvider` in `src/lib/theme.tsx` exposes `useTheme()`, plus design helpers (`hsl()`, `radius()`, `shadow.sm/md/lg`, `space`).
- Custom components: `Button`, `Card`, plus `Badge`, `SectionHeader`, `EmptyState`, `InfoRow` in `src/components/ui.tsx`.
- `app.json` has `"owner": "x-lucero"` and EAS `projectId`. The bundle identifier is `com.xlucero.spasoftware`.
- `eas.json` pins `node: "20.18.0"` — required because the workspace `engines.node >= 20`. Mobile doesn't have `engines` itself.
- `EAS_NO_VCS=1` is needed when building from a host without git visible (e.g. running via a tool harness). With git available, just run `eas build`.

### Deploy specifics

- **Render** (API): `apps/api/Dockerfile` is multi-stage, copies only `apps/api/` into the image (no monorepo concerns). The `CMD` retries `prisma migrate deploy` up to 6 times because Neon free tier sleeps; the first hit times out on advisory lock acquisition (P1002), the retry wakes it. The server starts even if migrate ultimately fails — tables exist after the first successful deploy.
- **Vercel** (web): Root Directory = `apps/web`. `vercel.json` only declares the framework. No special build command.
- **Render Blueprint** is committed (`render.yaml`) with `sync: false` on all secrets; values are set in the Render dashboard, not in code.
- **Keep-alive ping**: external cron should hit `https://<api>.onrender.com/api/health` (returns ~60 bytes). Pinging the Vercel front is pointless (Vercel doesn't sleep) and may exceed cron-job.org's 64 KB output cap.
- **GitHub Actions** (`.github/workflows/ci.yml`): typechecks api+web, validates Prisma schema, runs an informative mobile typecheck. The workflow file is local-only when an OAuth token lacks the `workflow` scope; add it via the GitHub UI in that case.

### Environment

- `apps/api/.env.example` lists every env var consumed by `src/env.ts` (validated with zod on startup; misconfiguration aborts the process). Key ones:
  - `DATABASE_URL` (Neon, with `sslmode=require`)
  - `JWT_SECRET` (≥32 chars; warning if <48 in prod)
  - `STORAGE_DRIVER`, `S3_*` (Cloudflare R2 in prod)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`, `MAIL_FROM` (must include angle brackets, e.g. `Spa <onboarding@resend.dev>`), `ADMIN_EMAIL`
  - `TOTP_ENCRYPTION_KEY` (for 2FA secret at rest)
  - `CORS_ORIGIN` — production rejects `*` at startup; trailing slashes are normalized away.
  - `SENTRY_DSN` + `SENTRY_TRACES_SAMPLE_RATE` (optional; silent in dev when empty).
  - `FOLLOWUP_INACTIVE_DAYS` / `FOLLOWUP_COOLDOWN_DAYS` / `FOLLOWUP_BATCH_LIMIT` (re-engagement cron).
- `apps/web/.env.local`: `NEXT_PUBLIC_API_URL` (must end with `/api`), `NEXT_PUBLIC_APP_URL`.
- `apps/mobile/.env`: `EXPO_PUBLIC_API_URL` (use LAN IP, not `localhost`, when testing on a physical device).

### Cross-cutting conventions

- All ID validation on routes uses `z.string().cuid()` and slices route params to 50 chars before passing to Prisma — this guards against pathological lookup costs and SSRF-via-id tricks.
- Image URLs from the admin must pass `isAllowedImageUrl` (whitelist of known hosts + R2 public domain set via `ALLOWED_IMAGE_HOSTS`). External hosts are rejected; users upload via `/api/uploads/image` instead.
- All emails go through `sendMail` in `src/mail.ts`. It's a no-op if `RESEND_API_KEY` or `MAIL_FROM` are missing. **Resend SDK v4 does NOT throw on send failure** — `result.error` must be checked explicitly (the wrapper does this and logs).
- Money is stored as integer cents everywhere (`Int`, never `Float`/`Decimal`).
- BNPL (Klarna/Affirm/Afterpay) is enabled per-tenant via `SiteConfig.enableBnpl`. When true, Stripe Checkout sessions add those payment methods; default is `["card"]` only. Both booking and package checkout flows read this flag.
