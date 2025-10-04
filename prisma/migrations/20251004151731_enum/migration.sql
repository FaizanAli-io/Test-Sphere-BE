/*
  Warnings:

  - The values [automatic,pending,graded] on the enum `GradingStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [screenshot,webcam_photo,system_event] on the enum `LogType` will be removed. If these variants are still used in the database, this will fail.
  - The values [in_progress,submitted,graded] on the enum `SubmissionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [draft,published,closed] on the enum `TestStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [teacher,student] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "GradingStatus_new" AS ENUM ('AUTOMATIC', 'PENDING', 'GRADED');
ALTER TABLE "public"."Answer" ALTER COLUMN "gradingStatus" DROP DEFAULT;
ALTER TABLE "Answer" ALTER COLUMN "gradingStatus" TYPE "GradingStatus_new" USING ("gradingStatus"::text::"GradingStatus_new");
ALTER TYPE "GradingStatus" RENAME TO "GradingStatus_old";
ALTER TYPE "GradingStatus_new" RENAME TO "GradingStatus";
DROP TYPE "public"."GradingStatus_old";
ALTER TABLE "Answer" ALTER COLUMN "gradingStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "LogType_new" AS ENUM ('SCREENSHOT', 'WEBCAM_PHOTO', 'SYSTEM_EVENT');
ALTER TABLE "ProctoringLog" ALTER COLUMN "logType" TYPE "LogType_new" USING ("logType"::text::"LogType_new");
ALTER TYPE "LogType" RENAME TO "LogType_old";
ALTER TYPE "LogType_new" RENAME TO "LogType";
DROP TYPE "public"."LogType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SubmissionStatus_new" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');
ALTER TABLE "public"."Submission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Submission" ALTER COLUMN "status" TYPE "SubmissionStatus_new" USING ("status"::text::"SubmissionStatus_new");
ALTER TYPE "SubmissionStatus" RENAME TO "SubmissionStatus_old";
ALTER TYPE "SubmissionStatus_new" RENAME TO "SubmissionStatus";
DROP TYPE "public"."SubmissionStatus_old";
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TestStatus_new" AS ENUM ('ACTIVE', 'CLOSED', 'DRAFT');
ALTER TABLE "public"."Test" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Test" ALTER COLUMN "status" TYPE "TestStatus_new" USING ("status"::text::"TestStatus_new");
ALTER TYPE "TestStatus" RENAME TO "TestStatus_old";
ALTER TYPE "TestStatus_new" RENAME TO "TestStatus";
DROP TYPE "public"."TestStatus_old";
ALTER TABLE "Test" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('TEACHER', 'STUDENT');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "Answer" ALTER COLUMN "gradingStatus" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Submission" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "Test" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
