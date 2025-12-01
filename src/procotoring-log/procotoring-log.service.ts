import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { LogType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UploadService } from "../upload/upload.service";
import { CreateProctoringLogDto } from "./procotoring-log.dto";

@Injectable()
export class ProctoringLogService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  private async verifyTeacherOwnership(submissionId: number, teacherId: number) {
    const submission = await this.prisma.submission.findUnique({
      include: { test: { include: { class: true } } },
      where: { id: submissionId },
    });

    if (!submission) {
      throw new BadRequestException("Submission not found");
    }

    if (!submission.test || !submission.test.class) {
      throw new BadRequestException("Invalid test or class association");
    }

    if (submission.test.class.teacherId !== teacherId) {
      throw new ForbiddenException("You do not own this class or test");
    }

    return submission;
  }

  private async verifyStudentOwnership(submissionId: number, studentId: number) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission || !submission.userId) {
      throw new BadRequestException("Valid submission not found");
    }

    if (submission.userId !== studentId) {
      throw new ForbiddenException("You do not own this submission");
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
      const existingMeta = (existing.meta as any[]) || [];
      const updatedMeta = [...existingMeta, ...(meta || [])];

      return this.prisma.proctoringLog.update({
        where: { id: existing.id },
        data: { meta: JSON.parse(JSON.stringify(updatedMeta)) },
        select: { id: true, logType: true, submissionId: true },
      });
    }

    return this.prisma.proctoringLog.create({
      data: {
        logType,
        submissionId,
        meta: meta ? JSON.parse(JSON.stringify(meta)) : [],
      },
      select: { id: true, logType: true, submissionId: true },
    });
  }

  async addLogs(logs: CreateProctoringLogDto[], studentId: number) {
    if (!logs || logs.length === 0) {
      return [];
    }

    // Verify ownership for all unique submissions
    const uniqueSubmissionIds = [...new Set(logs.map((log) => log.submissionId))];
    await Promise.all(
      uniqueSubmissionIds.map((submissionId) =>
        this.verifyStudentOwnership(submissionId, studentId),
      ),
    );

    // Group logs by submissionId and logType
    const logGroups = new Map<string, CreateProctoringLogDto[]>();
    for (const log of logs) {
      const key = `${log.submissionId}-${log.logType}`;
      if (!logGroups.has(key)) {
        logGroups.set(key, []);
      }
      logGroups.get(key)!.push(log);
    }

    // Process each group
    const results = await Promise.all(
      Array.from(logGroups.entries()).map(async ([key, groupLogs]) => {
        const [submissionId, logType] = key.split("-");
        const allMeta = groupLogs.flatMap((log) => (log.meta || []) as any[]);

        const existing = await this.prisma.proctoringLog.findFirst({
          where: { submissionId: parseInt(submissionId), logType: logType as LogType },
        });

        if (existing) {
          const existingMeta = (existing.meta as any[]) || [];
          const updatedMeta = [...existingMeta, ...allMeta];

          return this.prisma.proctoringLog.update({
            where: { id: existing.id },
            data: { meta: JSON.parse(JSON.stringify(updatedMeta)) },
            select: { id: true, logType: true, submissionId: true },
          });
        }

        return this.prisma.proctoringLog.create({
          data: {
            logType: logType as LogType,
            submissionId: parseInt(submissionId),
            meta: JSON.parse(JSON.stringify(allMeta)),
          },
          select: { id: true, logType: true, submissionId: true },
        });
      }),
    );

    return results;
  }

  async getLogs(submissionId: number, teacherId: number) {
    await this.verifyTeacherOwnership(submissionId, teacherId);

    const logs = await this.prisma.proctoringLog.findMany({ where: { submissionId } });

    return logs.map((log) => ({
      ...log,
      metaLength: Array.isArray(log.meta) ? log.meta.length : 0,
    }));
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
          ? log.meta.map((m: any) => m.fileId).filter((id: string | null | undefined) => !!id)
          : [],
      )
      .filter(Boolean);

    const deleteResults = fileIds.length ? await this.uploadService.deleteImages(fileIds) : [];

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
