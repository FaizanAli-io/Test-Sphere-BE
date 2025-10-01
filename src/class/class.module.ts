import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController, EnrollmentController } from './class.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ClassController, EnrollmentController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
