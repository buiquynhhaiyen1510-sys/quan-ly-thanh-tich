/*
  Warnings:

  - You are about to drop the column `type` on the `competition_titles` table. All the data in the column will be lost.
  - Added the required column `danhHieuId` to the `competition_titles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "competition_titles" DROP COLUMN "type",
ADD COLUMN     "danhHieuId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "eligibility_rules" ADD COLUMN     "danhHieuId" TEXT;

-- DropEnum
DROP TYPE "CompetitionTitleType";

-- CreateTable
CREATE TABLE "danh_hieus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "danh_hieus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "danh_hieus_name_key" ON "danh_hieus"("name");

-- CreateIndex
CREATE INDEX "danh_hieus_isActive_idx" ON "danh_hieus"("isActive");

-- CreateIndex
CREATE INDEX "competition_titles_danhHieuId_idx" ON "competition_titles"("danhHieuId");

-- AddForeignKey
ALTER TABLE "competition_titles" ADD CONSTRAINT "competition_titles_danhHieuId_fkey" FOREIGN KEY ("danhHieuId") REFERENCES "danh_hieus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_danhHieuId_fkey" FOREIGN KEY ("danhHieuId") REFERENCES "danh_hieus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
