-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('teacher', 'student');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "name" TEXT NOT NULL,
    "unique_identifier" VARCHAR(20) NOT NULL,
    "otp" VARCHAR(6),
    "otpExpiry" TIMESTAMP(3),
    "otpLastAttempt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."classes" (
    "class_id" SERIAL NOT NULL,
    "class_name" VARCHAR(255) NOT NULL,
    "teacher_id" INTEGER,
    "class_code" VARCHAR(10) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("class_id")
);

-- CreateTable
CREATE TABLE "public"."student_class_relations" (
    "student_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,

    CONSTRAINT "student_class_relations_pkey" PRIMARY KEY ("student_id","class_id")
);

-- CreateTable
CREATE TABLE "public"."tests" (
    "test_id" SERIAL NOT NULL,
    "class_id" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "disable_time" TIMESTAMP(3),

    CONSTRAINT "tests_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "question_id" SERIAL NOT NULL,
    "test_id" INTEGER,
    "text" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "options" TEXT[],
    "image" TEXT,
    "answer" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "public"."test_submission" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_time" TIMESTAMP(3) NOT NULL,
    "answers_submitted" BOOLEAN NOT NULL DEFAULT false,
    "photos_submitted" BOOLEAN NOT NULL DEFAULT false,
    "screenshots_submitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "test_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."test_answers" (
    "answer_id" SERIAL NOT NULL,
    "student_id" INTEGER,
    "question_id" INTEGER,
    "answer" TEXT,
    "test_id" INTEGER,
    "score" INTEGER,
    "obtained_marks" INTEGER,
    "total_marks" INTEGER,

    CONSTRAINT "test_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "public"."test_photos" (
    "photo_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3),
    "photos" BYTEA[],
    "screenshots" BYTEA[],

    CONSTRAINT "test_photos_pkey" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "public"."activity_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logs" JSONB,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."answer_marks" (
    "id" SERIAL NOT NULL,
    "test_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "obtained_marks" INTEGER,
    "total_marks" INTEGER,

    CONSTRAINT "answer_marks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_unique_identifier_key" ON "public"."users"("unique_identifier");

-- CreateIndex
CREATE UNIQUE INDEX "classes_class_code_key" ON "public"."classes"("class_code");

-- CreateIndex
CREATE UNIQUE INDEX "test_submission_user_id_test_id_key" ON "public"."test_submission"("user_id", "test_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_submission_user_id_test_id_class_id_key" ON "public"."test_submission"("user_id", "test_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_answers_test_id_question_id_student_id_key" ON "public"."test_answers"("test_id", "question_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "test_photos_user_id_test_id_key" ON "public"."test_photos"("user_id", "test_id");

-- CreateIndex
CREATE UNIQUE INDEX "answer_marks_test_id_student_id_question_id_key" ON "public"."answer_marks"("test_id", "student_id", "question_id");

-- AddForeignKey
ALTER TABLE "public"."classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_class_relations" ADD CONSTRAINT "student_class_relations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."student_class_relations" ADD CONSTRAINT "student_class_relations_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tests" ADD CONSTRAINT "tests_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."questions" ADD CONSTRAINT "questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_submission" ADD CONSTRAINT "test_submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_submission" ADD CONSTRAINT "test_submission_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_submission" ADD CONSTRAINT "test_submission_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_answers" ADD CONSTRAINT "test_answers_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_answers" ADD CONSTRAINT "test_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_answers" ADD CONSTRAINT "test_answers_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_answers" ADD CONSTRAINT "test_answers_student_id_test_id_fkey" FOREIGN KEY ("student_id", "test_id") REFERENCES "public"."test_submission"("user_id", "test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_photos" ADD CONSTRAINT "test_photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_photos" ADD CONSTRAINT "test_photos_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."test_photos" ADD CONSTRAINT "test_photos_user_id_test_id_fkey" FOREIGN KEY ("user_id", "test_id") REFERENCES "public"."test_submission"("user_id", "test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_test_id_fkey" FOREIGN KEY ("user_id", "test_id") REFERENCES "public"."test_submission"("user_id", "test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answer_marks" ADD CONSTRAINT "answer_marks_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answer_marks" ADD CONSTRAINT "answer_marks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."answer_marks" ADD CONSTRAINT "answer_marks_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;
