import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProctoringLog, Submission } from "../typeorm/entities";
import { UploadService } from "../upload/upload.service";
import { ProctoringLogService } from "./procotoring-log.service";
import { ProctoringLogController } from "./procotoring-log.controller";

@Module({
  imports: [TypeOrmModule.forFeature([ProctoringLog, Submission])],
  providers: [ProctoringLogService, UploadService],
  controllers: [ProctoringLogController],
  exports: [ProctoringLogService],
})
export class ProctoringLogModule {}
