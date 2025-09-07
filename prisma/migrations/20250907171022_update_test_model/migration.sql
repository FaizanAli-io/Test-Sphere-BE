/*
  Warnings:

  - You are about to drop the column `created_at` on the `tests` table. All the data in the column will be lost.
  - You are about to drop the column `instructions` on the `tests` table. All the data in the column will be lost.
  - You are about to drop the column `max_points` on the `tests` table. All the data in the column will be lost.
  - You are about to drop the column `teacher_id` on the `tests` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `tests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."tests" DROP CONSTRAINT "tests_teacher_id_fkey";

-- AlterTable
ALTER TABLE "public"."tests" DROP COLUMN "created_at",
DROP COLUMN "instructions",
DROP COLUMN "max_points",
DROP COLUMN "teacher_id",
DROP COLUMN "updated_at";
