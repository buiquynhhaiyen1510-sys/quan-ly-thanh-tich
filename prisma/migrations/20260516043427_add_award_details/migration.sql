-- AlterEnum
ALTER TYPE "AwardType" ADD VALUE 'CERTIFICATE_OF_MERIT';

-- AlterTable
ALTER TABLE "awards" ADD COLUMN     "attachmentUrls" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "decisionDate" TIMESTAMP(3),
ADD COLUMN     "decisionNumber" TEXT;
