import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClassService } from "./class.service";
import { ClassController } from "./class.controller";
import { Class, StudentClass, User } from "../typeorm/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Class, StudentClass, User])],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
