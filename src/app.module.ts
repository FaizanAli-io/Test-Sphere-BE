import { ConfigModule } from './config/config.module';
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { AgentModule } from './agent/agent.module';
import { ClassModule } from './class/class.module';
import { UploadModule } from './upload/upload.module';
import { SubmissionModule } from './submission/submission.module';
import { ProctoringLogModule } from './procotoring-log/procotoring-log.module';
import { StreamingModule } from './streaming/streaming.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { TypeOrmConfigModule } from './typeorm/typeorm.module';
import { User } from './typeorm/entities';

@Module({
  imports: [
    ConfigModule,
    TypeOrmConfigModule,
    TypeOrmModule.forFeature([User]),
    AuthModule,
    TestModule,
    AgentModule,
    ClassModule,
    UploadModule,
    SubmissionModule,
    ProctoringLogModule,
    StreamingModule,
  ],
  providers: [AppService],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
