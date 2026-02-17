import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ClassRoleGuard } from "../guards/class-role.guard";
import { Test, Question, Submission, QuestionPool, ClassTeacher } from "../../typeorm/entities";

@Module({
  imports: [TypeOrmModule.forFeature([Test, Question, Submission, QuestionPool, ClassTeacher])],
  exports: [ClassRoleGuard, TypeOrmModule],
  providers: [ClassRoleGuard],
})
export class ClassAccessModule {}
