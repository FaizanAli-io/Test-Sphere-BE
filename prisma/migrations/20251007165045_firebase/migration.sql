/*
  Warnings:

  - You are about to alter the column `obtainedMarks` on the `Answer` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `otpAttempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otpLastAttempt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firebaseId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Answer" ALTER COLUMN "obtainedMarks" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otpAttempts",
DROP COLUMN "otpLastAttempt",
ADD COLUMN     "firebaseId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseId_key" ON "User"("firebaseId");
