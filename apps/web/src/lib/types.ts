export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  imageUrl: string | null;
  active: boolean;
  featured: boolean;
  categoryId: string | null;
  category?: Category | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  _count?: { services: number };
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  notes: string | null;
  privateNotes?: string | null;
  createdAt: string;
  _count?: { bookings: number };
}

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface Booking {
  id: string;
  customerId: string;
  serviceId: string;
  staffId: string | null;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  priceCents: number;
  basePriceCents: number;
  discountCents: number;
  couponId: string | null;
  notes: string | null;
  customer?: Customer;
  service?: Service;
  staff?: Staff | null;
  coupon?: Coupon | null;
  payment?: Payment | null;
}

export interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  active: boolean;
  workingDays: number[];
  workingFrom: number;
  workingTo: number;
  commissionPercent: number;
  services?: { id: string; name: string }[];
}

export type ProductMovementType = "IN" | "OUT" | "ADJUSTMENT";

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  stock: number;
  unit: string | null;
  costCents: number | null;
  priceCents: number | null;
  lowStockAlert: number;
  imageUrl: string | null;
  active: boolean;
  movements?: ProductMovement[];
}

export interface ProductMovement {
  id: string;
  productId: string;
  type: ProductMovementType;
  quantity: number;
  unitCostCents: number | null;
  note: string | null;
  createdAt: string;
}

export interface StaffBlock {
  id: string;
  staffId: string;
  staff?: { id: string; name: string };
  startAt: string;
  endAt: string;
  reason: string | null;
}

export interface CommissionSummary {
  staff: { id: string; name: string; commissionPercent: number; avatarUrl: string | null };
  totalRevenue: number;
  commissionCents: number;
  count: number;
}

// ─── Marketing ─────
export interface PromoBanner {
  id: string;
  active: boolean;
  text: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
}

export interface PromoPopup {
  id: string;
  active: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string | null;
  showAfterSec: number;
  showOncePerDays: number;
}

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";

export interface EmailCampaign {
  id: string;
  subject: string;
  htmlBody: string;
  preheader: string | null;
  status: CampaignStatus;
  sentAt: string | null;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
}

export interface LoyaltySettings {
  id: string;
  active: boolean;
  pointsPerDollar: number;
  pointValueCents: number;
  minRedeemPoints: number;
}

export interface LoyaltyAccount {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; phone: string; email: string | null };
  pointsBalance: number;
  totalEarned: number;
  totalRedeemed: number;
}

// ─── Sales ─────
export type PackagePurchaseStatus =
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "EXPIRED"
  | "USED_UP"
  | "CANCELLED";

export interface ServicePackage {
  id: string;
  serviceId: string;
  service?: { id: string; name: string; slug?: string; durationMinutes?: number };
  name: string;
  sessions: number;
  priceCents: number;
  validityDays: number;
  active: boolean;
  _count?: { purchases: number };
}

export interface PackagePurchase {
  id: string;
  packageId: string;
  package?: { id: string; name: string; service?: { id: string; name: string } };
  customerId: string;
  customer?: { id: string; name: string; phone: string; email: string | null };
  sessionsTotal: number;
  sessionsRemaining: number;
  status: PackagePurchaseStatus;
  paidCents: number;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
}

export interface MembershipTier {
  id: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  discountPercent: number;
  perks: string | null;
  color: string | null;
  active: boolean;
  _count?: { memberships: number };
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; phone: string; email: string | null };
  tierId: string;
  tier?: { id: string; name: string; color: string | null; discountPercent: number };
  startedAt: string;
  expiresAt: string | null;
  active: boolean;
  note: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  minPriceCents: number | null;
  _count?: { bookings: number };
}

export interface ClosedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface GiftCard {
  id: string;
  code: string;
  initialCents: number;
  balanceCents: number;
  currency: string;
  status: "PENDING_PAYMENT" | "ACTIVE" | "USED_UP" | "EXPIRED" | "REFUNDED" | "CANCELLED";
  purchaserName: string;
  purchaserEmail: string;
  recipientName: string | null;
  recipientEmail: string | null;
  message: string | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  _count?: { redemptions: number };
}

export interface SecurityEvent {
  id: string;
  type: string;
  email: string | null;
  ip: string | null;
  userAgent: string | null;
  meta: any;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  method: string;
  paidAt: string | null;
}

export interface Theme {
  id: string;
  colorPrimary: string;
  colorSecondary: string;
  colorAccent: string;
  colorBackground: string;
  colorForeground: string;
  colorMuted: string;
  colorHeader: string;
  borderRadius: string;
  cardPadding: string;
  containerWidth: string;
  fontFamily: string;
  fontSizeBase: string;
  template: "elegant" | "modern" | "minimal" | "luxury";
}

export interface HoursByDay {
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  sun?: string;
}

export interface SiteConfig {
  id: string;
  spaName: string;
  tagline: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  whatsappPhone: string;
  whatsappMsg: string;
  callPhone: string | null;
  email: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  openingHours: string | null;
  hoursByDay: HoursByDay | null;
  aboutTitle: string | null;
  aboutText: string | null;
  aboutImageUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  cancellationPolicy: string | null;
  privacyPolicy: string | null;
  termsOfService: string | null;
  enableBnpl?: boolean;
  navLinks?: { href: string; label: string; visible: boolean }[] | null;
}

export interface Photo {
  id: string;
  url: string;
  caption: string | null;
  order: number;
  active: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  authorName: string;
  authorEmail?: string | null;
  rating: number;
  comment: string;
  serviceName: string | null;
  published?: boolean;
  featured: boolean;
  response?: string | null;
  respondedAt?: string | null;
  createdAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  active: boolean;
  createdAt: string;
}

// ───────── Finanzas ─────────
export type TxType = "INCOME" | "EXPENSE";
export type TxSource = "MANUAL" | "BOOKING" | "GIFT_CARD" | "RECURRING" | "REFUND";
export type RecurFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface FinanceCategory {
  id: string;
  name: string;
  type: TxType;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  _count?: { transactions: number };
}

export interface Transaction {
  id: string;
  type: TxType;
  source: TxSource;
  amountCents: number;
  date: string;
  description: string | null;
  note: string | null;
  categoryId: string | null;
  category?: FinanceCategory | null;
  bookingId: string | null;
  giftCardId: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  amountCents: number;
  type: TxType;
  categoryId: string | null;
  category?: FinanceCategory | null;
  frequency: RecurFrequency;
  dayOfMonth: number | null;
  monthOfYear: number | null;
  weekday: number | null;
  active: boolean;
  nextDueDate: string;
  lastRunAt: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  totpEnabled?: boolean;
  recoveryCount?: number;
  lastLoginAt?: string | null;
}
