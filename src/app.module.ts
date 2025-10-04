import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { TestModule } from './test/test.module';
import { ClassModule } from './class/class.module';
// import { UploadModule } from './upload/upload.module';
// import { DownloadModule } from './download/download.module';
// import { DashboardModule } from './dashboard/dashboard.module';

import { AppService } from './app.service';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TestModule,
    ClassModule,
    // UploadModule,
    // DownloadModule,
    // DashboardModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
