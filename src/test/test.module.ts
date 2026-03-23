import { memoryStorage } from 'multer';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { TestService } from './test.service';
import { TestAnalyticsService } from './test-analytics.service';
import { ClassAccessModule } from '../common/access-models/class-role.access-model';
import { Test, Answer, Question, Submission, QuestionPool } from '../typeorm/entities';
import { TestController, QuestionController, QuestionPoolController } from './test.controller';

const MB = 1024 * 1024;

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage(), limits: { fileSize: 10 * MB } }),
    TypeOrmModule.forFeature([Test, Question, QuestionPool, Submission, Answer]),
    ClassAccessModule,
  ],
  controllers: [TestController, QuestionController, QuestionPoolController],
  providers: [TestService, TestAnalyticsService],
  exports: [TestService, TestAnalyticsService],
})
export class TestModule {}
