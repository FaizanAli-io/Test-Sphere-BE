import { ConfigModule } from '@nestjs/config';
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

import { AuthModule } from './auth/auth.module';
import { LogsModule } from './logs/logs.module';
import { TestModule } from './test/test.module';
import { AgentModule } from './agent/agent.module';
import { ClassModule } from './class/class.module';
import { UploadModule } from './upload/upload.module';
import { SubmissionModule } from './submission/submission.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TestModule,
    ClassModule,
    UploadModule,
    SubmissionModule,
    PrismaModule,
    AgentModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
