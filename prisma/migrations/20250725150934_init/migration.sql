/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `ProposalStatuses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `ProposalStatuses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProposalStatuses" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProposalStatuses_slug_key" ON "ProposalStatuses"("slug");
