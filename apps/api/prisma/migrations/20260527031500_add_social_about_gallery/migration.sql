-- AlterTable
ALTER TABLE "SiteConfig" ADD COLUMN     "aboutImageUrl" TEXT,
ADD COLUMN     "aboutText" TEXT,
ADD COLUMN     "aboutTitle" TEXT,
ADD COLUMN     "callPhone" TEXT,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "hoursByDay" JSONB,
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "privacyPolicy" TEXT,
ADD COLUMN     "termsOfService" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "twitterUrl" TEXT,
ADD COLUMN     "youtubeUrl" TEXT;

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Photo_active_order_idx" ON "Photo"("active", "order");
