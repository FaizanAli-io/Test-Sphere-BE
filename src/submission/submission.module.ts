import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadService } from '../upload/upload.service';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { ProctoringLogService } from '../procotoring-log/procotoring-log.service';
import { ClassAccessModule } from '../common/access-models/class-role.access-model';
import { Submission, Answer, Test, User, Question, ProctoringLog } from '../typeorm/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Answer, Test, User, Question, ProctoringLog]),
    ClassAccessModule,
  ],
  providers: [SubmissionService, ProctoringLogService, UploadService],
  controllers: [SubmissionController],
})
export class SubmissionModule {}
