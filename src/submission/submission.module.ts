import { Module } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';

@Module({
  providers: [SubmissionService],
  controllers: [SubmissionController]
})
export class SubmissionModule {}
