import { Module } from "@nestjs/common";
import { UploadService } from "../upload/upload.service";
import { SubmissionService } from "./submission.service";
import { SubmissionController } from "./submission.controller";
import { ProctoringLogService } from "../procotoring-log/procotoring-log.service";

@Module({
  providers: [SubmissionService, ProctoringLogService, UploadService],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
