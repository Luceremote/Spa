-- CreateEnum
CREATE TYPE "ProductMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "privateNotes" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "commissionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StaffBlock" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "description" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "costCents" INTEGER,
    "priceCents" INTEGER,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "ProductMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffBlock_staffId_startAt_idx" ON "StaffBlock"("staffId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE INDEX "ProductMovement_productId_createdAt_idx" ON "ProductMovement"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "StaffBlock" ADD CONSTRAINT "StaffBlock_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMovement" ADD CONSTRAINT "ProductMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
