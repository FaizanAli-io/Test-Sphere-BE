-- Add new fields to Test model
ALTER TABLE "tests" ADD COLUMN "instructions" TEXT;
ALTER TABLE "tests" ADD COLUMN "max_points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tests" ADD COLUMN "teacher_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE;

-- Add created_at and updated_at to Test
ALTER TABLE "tests" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "tests" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
