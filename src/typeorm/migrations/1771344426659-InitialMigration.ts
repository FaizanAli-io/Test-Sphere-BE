import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1771344426659 implements MigrationInterface {
    name = 'InitialMigration1771344426659'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`class\` (\`id\` int NOT NULL AUTO_INCREMENT, \`code\` varchar(10) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_803bbfb4e9c41f0385a40bc219\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`test\` (\`id\` int NOT NULL AUTO_INCREMENT, \`classId\` int NOT NULL, \`title\` varchar(255) NOT NULL, \`description\` text NULL, \`duration\` int NOT NULL, \`startAt\` datetime NOT NULL, \`endAt\` datetime NOT NULL, \`status\` enum ('ACTIVE', 'CLOSED', 'DRAFT') NOT NULL DEFAULT 'DRAFT', \`config\` json NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`question_pool\` (\`id\` int NOT NULL AUTO_INCREMENT, \`testId\` int NOT NULL, \`title\` varchar(255) NOT NULL, \`config\` json NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_1f2366ba2ca70423ccddc6f219\` (\`testId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`student_class\` (\`studentId\` int NOT NULL, \`classId\` int NOT NULL, \`approved\` tinyint NOT NULL DEFAULT 0, \`joinedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`studentId\`, \`classId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`answer\` (\`id\` int NOT NULL AUTO_INCREMENT, \`studentId\` int NOT NULL, \`questionId\` int NOT NULL, \`submissionId\` int NOT NULL, \`answer\` text NULL, \`obtainedMarks\` int NULL, \`gradingStatus\` enum ('AUTOMATIC', 'PENDING', 'GRADED') NOT NULL DEFAULT 'PENDING', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_1398cb4bf7f1ccc37fa0dd538f\` (\`submissionId\`), UNIQUE INDEX \`IDX_1f361798865b6fdb87d72f2690\` (\`studentId\`, \`questionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`question\` (\`id\` int NOT NULL AUTO_INCREMENT, \`testId\` int NOT NULL, \`text\` varchar(1000) NOT NULL, \`type\` enum ('MULTIPLE_CHOICE', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE') NOT NULL, \`options\` json NULL, \`correctAnswer\` int NULL, \`maxMarks\` int NOT NULL DEFAULT '1', \`image\` varchar(255) NULL, \`questionPoolId\` int NULL, INDEX \`IDX_e308f7980fd8d75cd7e45828f4\` (\`questionPoolId\`), INDEX \`IDX_2c8f911efa2fb5b0fe1abe9202\` (\`testId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`proctoring_log\` (\`id\` int NOT NULL AUTO_INCREMENT, \`submissionId\` int NOT NULL, \`meta\` json NULL, \`logType\` enum ('SCREENSHOT', 'WEBCAM_PHOTO', 'FOCUS_CHANGE', 'MOUSECLICK', 'KEYSTROKE') NOT NULL, INDEX \`IDX_db6d1a709548e5b3ba699fb2da\` (\`logType\`), INDEX \`IDX_abb7ec6bab18816a10b1eb4d55\` (\`submissionId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`submission\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`testId\` int NOT NULL, \`status\` enum ('IN_PROGRESS', 'SUBMITTED', 'GRADED') NOT NULL DEFAULT 'IN_PROGRESS', \`startedAt\` datetime NOT NULL, \`submittedAt\` datetime NULL, \`gradedAt\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_53685d02371670b4495ff181ae\` (\`testId\`), UNIQUE INDEX \`IDX_22821319e04ec6d1c93d598757\` (\`userId\`, \`testId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`class_teacher\` (\`teacherId\` int NOT NULL, \`classId\` int NOT NULL, \`role\` enum ('OWNER', 'EDITOR', 'VIEWER') NOT NULL, \`assignedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`teacherId\`, \`classId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`firebaseId\` varchar(255) NULL, \`cnic\` varchar(20) NOT NULL, \`role\` enum ('TEACHER', 'STUDENT') NOT NULL, \`name\` varchar(255) NOT NULL, \`password\` varchar(255) NULL, \`profileImage\` varchar(255) NULL, \`verified\` tinyint NOT NULL DEFAULT 0, \`otp\` varchar(6) NULL, \`otpExpiry\` datetime NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_0d0275eb97751f211d85ffeb2b\` (\`cnic\`), UNIQUE INDEX \`IDX_4d8f69fd9538c19d3a42518fea\` (\`firebaseId\`), UNIQUE INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`test\` ADD CONSTRAINT \`FK_21131fb0e303abc2647f0ddfa4e\` FOREIGN KEY (\`classId\`) REFERENCES \`class\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`question_pool\` ADD CONSTRAINT \`FK_1f2366ba2ca70423ccddc6f219d\` FOREIGN KEY (\`testId\`) REFERENCES \`test\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`student_class\` ADD CONSTRAINT \`FK_54d9dc074a5b2c5a75514e2223f\` FOREIGN KEY (\`studentId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`student_class\` ADD CONSTRAINT \`FK_509d644c30e7b1d6dd4aa35c384\` FOREIGN KEY (\`classId\`) REFERENCES \`class\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`answer\` ADD CONSTRAINT \`FK_9d4daff8d1c25fef94b5f04cf54\` FOREIGN KEY (\`studentId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`answer\` ADD CONSTRAINT \`FK_a4013f10cd6924793fbd5f0d637\` FOREIGN KEY (\`questionId\`) REFERENCES \`question\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`answer\` ADD CONSTRAINT \`FK_1398cb4bf7f1ccc37fa0dd538ff\` FOREIGN KEY (\`submissionId\`) REFERENCES \`submission\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`question\` ADD CONSTRAINT \`FK_2c8f911efa2fb5b0fe1abe92020\` FOREIGN KEY (\`testId\`) REFERENCES \`test\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`question\` ADD CONSTRAINT \`FK_e308f7980fd8d75cd7e45828f43\` FOREIGN KEY (\`questionPoolId\`) REFERENCES \`question_pool\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`proctoring_log\` ADD CONSTRAINT \`FK_abb7ec6bab18816a10b1eb4d559\` FOREIGN KEY (\`submissionId\`) REFERENCES \`submission\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`submission\` ADD CONSTRAINT \`FK_7bd626272858ef6464aa2579094\` FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`submission\` ADD CONSTRAINT \`FK_53685d02371670b4495ff181aec\` FOREIGN KEY (\`testId\`) REFERENCES \`test\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`class_teacher\` ADD CONSTRAINT \`FK_609d005f75a0bcffd7fd11ac9c9\` FOREIGN KEY (\`teacherId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`class_teacher\` ADD CONSTRAINT \`FK_1b4adc80d48f7c04ed8e5f12baa\` FOREIGN KEY (\`classId\`) REFERENCES \`class\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`class_teacher\` DROP FOREIGN KEY \`FK_1b4adc80d48f7c04ed8e5f12baa\``);
        await queryRunner.query(`ALTER TABLE \`class_teacher\` DROP FOREIGN KEY \`FK_609d005f75a0bcffd7fd11ac9c9\``);
        await queryRunner.query(`ALTER TABLE \`submission\` DROP FOREIGN KEY \`FK_53685d02371670b4495ff181aec\``);
        await queryRunner.query(`ALTER TABLE \`submission\` DROP FOREIGN KEY \`FK_7bd626272858ef6464aa2579094\``);
        await queryRunner.query(`ALTER TABLE \`proctoring_log\` DROP FOREIGN KEY \`FK_abb7ec6bab18816a10b1eb4d559\``);
        await queryRunner.query(`ALTER TABLE \`question\` DROP FOREIGN KEY \`FK_e308f7980fd8d75cd7e45828f43\``);
        await queryRunner.query(`ALTER TABLE \`question\` DROP FOREIGN KEY \`FK_2c8f911efa2fb5b0fe1abe92020\``);
        await queryRunner.query(`ALTER TABLE \`answer\` DROP FOREIGN KEY \`FK_1398cb4bf7f1ccc37fa0dd538ff\``);
        await queryRunner.query(`ALTER TABLE \`answer\` DROP FOREIGN KEY \`FK_a4013f10cd6924793fbd5f0d637\``);
        await queryRunner.query(`ALTER TABLE \`answer\` DROP FOREIGN KEY \`FK_9d4daff8d1c25fef94b5f04cf54\``);
        await queryRunner.query(`ALTER TABLE \`student_class\` DROP FOREIGN KEY \`FK_509d644c30e7b1d6dd4aa35c384\``);
        await queryRunner.query(`ALTER TABLE \`student_class\` DROP FOREIGN KEY \`FK_54d9dc074a5b2c5a75514e2223f\``);
        await queryRunner.query(`ALTER TABLE \`question_pool\` DROP FOREIGN KEY \`FK_1f2366ba2ca70423ccddc6f219d\``);
        await queryRunner.query(`ALTER TABLE \`test\` DROP FOREIGN KEY \`FK_21131fb0e303abc2647f0ddfa4e\``);
        await queryRunner.query(`DROP INDEX \`IDX_e12875dfb3b1d92d7d7c5377e2\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_4d8f69fd9538c19d3a42518fea\` ON \`user\``);
        await queryRunner.query(`DROP INDEX \`IDX_0d0275eb97751f211d85ffeb2b\` ON \`user\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP TABLE \`class_teacher\``);
        await queryRunner.query(`DROP INDEX \`IDX_22821319e04ec6d1c93d598757\` ON \`submission\``);
        await queryRunner.query(`DROP INDEX \`IDX_53685d02371670b4495ff181ae\` ON \`submission\``);
        await queryRunner.query(`DROP TABLE \`submission\``);
        await queryRunner.query(`DROP INDEX \`IDX_abb7ec6bab18816a10b1eb4d55\` ON \`proctoring_log\``);
        await queryRunner.query(`DROP INDEX \`IDX_db6d1a709548e5b3ba699fb2da\` ON \`proctoring_log\``);
        await queryRunner.query(`DROP TABLE \`proctoring_log\``);
        await queryRunner.query(`DROP INDEX \`IDX_2c8f911efa2fb5b0fe1abe9202\` ON \`question\``);
        await queryRunner.query(`DROP INDEX \`IDX_e308f7980fd8d75cd7e45828f4\` ON \`question\``);
        await queryRunner.query(`DROP TABLE \`question\``);
        await queryRunner.query(`DROP INDEX \`IDX_1f361798865b6fdb87d72f2690\` ON \`answer\``);
        await queryRunner.query(`DROP INDEX \`IDX_1398cb4bf7f1ccc37fa0dd538f\` ON \`answer\``);
        await queryRunner.query(`DROP TABLE \`answer\``);
        await queryRunner.query(`DROP TABLE \`student_class\``);
        await queryRunner.query(`DROP INDEX \`IDX_1f2366ba2ca70423ccddc6f219\` ON \`question_pool\``);
        await queryRunner.query(`DROP TABLE \`question_pool\``);
        await queryRunner.query(`DROP TABLE \`test\``);
        await queryRunner.query(`DROP INDEX \`IDX_803bbfb4e9c41f0385a40bc219\` ON \`class\``);
        await queryRunner.query(`DROP TABLE \`class\``);
    }

}
