import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivePools1773318655374 implements MigrationInterface {
    name = 'ActivePools1773318655374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`question_pool\` ADD \`active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`proctoring_log\` CHANGE \`logType\` \`logType\` enum ('SCREENSHOT', 'WEBCAM_PHOTO', 'FOCUS_CHANGE', 'MOUSECLICK', 'KEYSTROKE', 'AI_INSIGHT') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`proctoring_log\` CHANGE \`logType\` \`logType\` enum ('SCREENSHOT', 'WEBCAM_PHOTO', 'FOCUS_CHANGE', 'MOUSECLICK', 'KEYSTROKE') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`question_pool\` DROP COLUMN \`active\``);
    }

}
