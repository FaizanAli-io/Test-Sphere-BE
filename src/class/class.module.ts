import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassService } from './class.service';
import { User, Class, ClassTeacher, StudentClass } from '../typeorm/entities';
import { ClassAccessModule } from '../common/access-models/class-role.access-model';
import {
  ClassController,
  StudentClassController,
  TeacherClassController,
} from './class.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Class, ClassTeacher, StudentClass]), ClassAccessModule],
  controllers: [ClassController, StudentClassController, TeacherClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
