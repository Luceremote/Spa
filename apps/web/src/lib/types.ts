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
  services?: { id: string; name: string }[];
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  totpEnabled?: boolean;
  recoveryCount?: number;
  lastLoginAt?: string | null;
}
