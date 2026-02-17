import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UploadService } from "../upload/upload.service";
import { Submission, ProctoringLog } from "../typeorm/entities";
import { ProctoringLogService } from "./procotoring-log.service";
import { ProctoringLogController } from "./procotoring-log.controller";
import { ClassAccessModule } from "../common/access-models/class-role.access-model";

@Module({
  imports: [TypeOrmModule.forFeature([Submission, ProctoringLog]), ClassAccessModule],
  providers: [ProctoringLogService, UploadService],
  controllers: [ProctoringLogController],
  exports: [ProctoringLogService],
})
export class ProctoringLogModule {}
