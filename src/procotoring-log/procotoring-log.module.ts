import { Module } from '@nestjs/common';
import { ProctoringLogService } from './procotoring-log.service';
import { ProctoringLogController } from './procotoring-log.controller';

@Module({
  providers: [ProctoringLogService],
  controllers: [ProctoringLogController],
})
export class ProctoringLogModule {}
