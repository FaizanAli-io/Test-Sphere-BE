import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LogType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProctoringLogDto } from './procotoring-log.dto';

@Injectable()
export class ProctoringLogService {
  constructor(private prisma: PrismaService) {}

  private async verifyTeacherOwnership(
    submissionId: number,
    teacherId: number,
  ) {
    const submission = await this.prisma.submission.findUnique({
      include: { test: { include: { class: true } } },
      where: { id: submissionId },
    });

    if (!submission) {
      throw new BadRequestException('Submission not found');
    }

    if (!submission.test || !submission.test.class) {
      throw new BadRequestException('Invalid test or class association');
    }

    if (submission.test.class.teacherId !== teacherId) {
      throw new ForbiddenException('You do not own this class or test');
    }

    return submission;
  }

  async addLog(dto: CreateProctoringLogDto, teacherId: number) {
    const { submissionId, logType, meta } = dto;

    await this.verifyTeacherOwnership(submissionId, teacherId);

    const existing = await this.prisma.proctoringLog.findFirst({
      where: { submissionId, logType },
    });

    if (existing) {
      if (logType === LogType.SCREENSHOT || logType === LogType.WEBCAM_PHOTO) {
        const existingMeta = (existing.meta as any[]) || [];
        const updatedMeta = [...existingMeta, ...(meta || [])];

        return this.prisma.proctoringLog.update({
          where: { id: existing.id },
          data: { meta: JSON.parse(JSON.stringify(updatedMeta)) },
        });
      }

      if (logType === LogType.SYSTEM_EVENT) {
        throw new BadRequestException(
          'System event logging not yet implemented',
        );
      }
    }

    return this.prisma.proctoringLog.create({
      data: {
        submissionId,
        logType,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : [],
      },
    });
  }

  async getLogs(submissionId: number, teacherId: number) {
    await this.verifyTeacherOwnership(submissionId, teacherId);

    return this.prisma.proctoringLog.findMany({
      where: { submissionId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async clearLogsForSubmission(submissionId: number, teacherId: number) {
    await this.verifyTeacherOwnership(submissionId, teacherId);

    const result = await this.prisma.proctoringLog.deleteMany({
      where: { submissionId },
    });

    return {
      message: `Deleted ${result.count} log(s) for submission ${submissionId}`,
    };
  }
}
