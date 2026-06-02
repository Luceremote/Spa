-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'NOTIFIED', 'CONVERTED', 'CANCELLED');

-- AlterTable: Review foto opcional
ALTER TABLE "Review" ADD COLUMN "photoUrl" TEXT;

-- AlterTable: CustomerMembership campos de Stripe Subscriptions
ALTER TABLE "CustomerMembership" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "CustomerMembership" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "CustomerMembership" ADD COLUMN "stripeStatus" TEXT;

-- CreateIndex unico para stripeSubscriptionId
CREATE UNIQUE INDEX "CustomerMembership_stripeSubscriptionId_key" ON "CustomerMembership"("stripeSubscriptionId");

-- CreateTable WaitlistEntry
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "preferredDate" DATE,
    "note" TEXT,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WaitlistEntry_serviceId_status_idx" ON "WaitlistEntry"("serviceId", "status");
CREATE INDEX "WaitlistEntry_status_createdAt_idx" ON "WaitlistEntry"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
