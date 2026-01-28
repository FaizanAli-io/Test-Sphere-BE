import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { memoryStorage } from "multer";

import { TestService } from "./test.service";
import { TestController } from "./test.controller";
import { Test, Question, Submission, Answer } from "../typeorm/entities";

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, Question, Submission, Answer]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — adjust as needed
    }),
  ],
  controllers: [TestController],
  providers: [TestService],
  exports: [TestService],
})
export class TestModule {}
