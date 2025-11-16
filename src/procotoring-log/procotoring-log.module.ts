import { Module } from "@nestjs/common";
import { UploadService } from "../upload/upload.service";
import { ProctoringLogService } from "./procotoring-log.service";
import { ProctoringLogController } from "./procotoring-log.controller";

@Module({
  providers: [ProctoringLogService, UploadService],
  controllers: [ProctoringLogController],
  exports: [ProctoringLogService],
})
export class ProctoringLogModule {}
