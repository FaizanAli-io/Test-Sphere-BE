import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { LogType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateProctoringLogDto } from './procotoring-log.dto';

@Injectable()
export class ProctoringLogService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

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

  private async verifyStudentOwnership(
    submissionId: number,
    studentId: number,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || !submission.userId) {
      throw new BadRequestException('Valid submission not found');
    }

    if (submission.userId !== studentId) {
      throw new ForbiddenException('You do not own this submission');
    }

    return submission;
  }

  async addLog(dto: CreateProctoringLogDto, studentId: number) {
    const { submissionId, logType, meta } = dto;

    await this.verifyStudentOwnership(submissionId, studentId);

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
        logType,
        submissionId,
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

    const logs = await this.prisma.proctoringLog.findMany({
      where: { submissionId },
      select: { meta: true },
    });

    const fileIds = logs
      .flatMap((log) =>
        Array.isArray(log.meta)
          ? log.meta
              .map((m: any) => m.fileId)
              .filter((id: string | null | undefined) => !!id)
          : [],
      )
      .filter(Boolean);

    const deleteResults = fileIds.length
      ? await this.uploadService.deleteImages(fileIds)
      : [];

    const dbResult = await this.prisma.proctoringLog.deleteMany({
      where: { submissionId },
    });

    return {
      logsDeleted: dbResult.count,
      imagesAttempted: fileIds.length,
      imageDeletionResults: deleteResults,
      message: `Deleted ${dbResult.count} log(s) and attempted to remove ${fileIds.length} image(s) for submission ${submissionId}.`,
    };
  }
}
