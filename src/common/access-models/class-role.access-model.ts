import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClassRoleGuard } from "../guards/class-role.guard";
import { Test, Question, QuestionPool, ClassTeacher } from "../../typeorm/entities";

@Module({
  imports: [TypeOrmModule.forFeature([ClassTeacher, Test, Question, QuestionPool])],
  exports: [ClassRoleGuard, TypeOrmModule],
  providers: [ClassRoleGuard],
})
export class ClassAccessModule {}
