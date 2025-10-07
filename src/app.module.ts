import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { LogsModule } from './logs/logs.module';
import { TestModule } from './test/test.module';
import { AgentModule } from './agent/agent.module';
import { ClassModule } from './class/class.module';
import { SubmissionModule } from './submission/submission.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TestModule,
    ClassModule,
    SubmissionModule,
    PrismaModule,
    AgentModule,
    LogsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
