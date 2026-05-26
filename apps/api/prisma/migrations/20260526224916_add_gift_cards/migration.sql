-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'USED_UP', 'EXPIRED', 'REFUNDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "initialCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "GiftCardStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "purchaserName" TEXT NOT NULL,
    "purchaserEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "message" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardRedemption" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_stripeSessionId_key" ON "GiftCard"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_stripePaymentIntentId_key" ON "GiftCard"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "GiftCard_status_idx" ON "GiftCard"("status");

-- CreateIndex
CREATE INDEX "GiftCard_purchaserEmail_idx" ON "GiftCard"("purchaserEmail");

-- CreateIndex
CREATE INDEX "GiftCard_recipientEmail_idx" ON "GiftCard"("recipientEmail");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_giftCardId_idx" ON "GiftCardRedemption"("giftCardId");

-- CreateIndex
CREATE INDEX "GiftCardRedemption_bookingId_idx" ON "GiftCardRedemption"("bookingId");

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardRedemption" ADD CONSTRAINT "GiftCardRedemption_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
