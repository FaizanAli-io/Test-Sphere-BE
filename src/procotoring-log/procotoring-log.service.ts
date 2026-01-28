import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { ProctoringLog, LogType, Submission } from "../typeorm/entities";
import { UploadService } from "../upload/upload.service";
import { CreateProctoringLogDto } from "./procotoring-log.dto";

@Injectable()
export class ProctoringLogService {
  constructor(
    @InjectRepository(ProctoringLog)
    private proctoringLogRepository: Repository<ProctoringLog>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    private uploadService: UploadService,
  ) {}

  private async verifyTeacherOwnership(submissionId: number, teacherId: number) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ["test", "test.class"],
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
    const submission = await this.submissionRepository.findOne({
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

    const existing = await this.proctoringLogRepository.findOne({
      where: { submissionId, logType: logType as LogType },
    });

    if (existing) {
      const existingMeta = (existing.meta as any[]) || [];
      const updatedMeta = [...existingMeta, ...(meta || [])];

      await this.proctoringLogRepository.update(
        { id: existing.id },
        { meta: JSON.parse(JSON.stringify(updatedMeta)) },
      );

      return {
        id: existing.id,
        logType: existing.logType,
        submissionId: existing.submissionId,
      };
    }

    const newLog = this.proctoringLogRepository.create({
      logType: logType as LogType,
      submissionId,
      meta: meta ? JSON.parse(JSON.stringify(meta)) : [],
    });

    const savedLog = await this.proctoringLogRepository.save(newLog);

    return {
      id: savedLog.id,
      logType: savedLog.logType,
      submissionId: savedLog.submissionId,
    };
  }

  async addLogs(logs: CreateProctoringLogDto[], studentId: number) {
    if (!logs || (logs as any).length === 0) {
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

        const existing = await this.proctoringLogRepository.findOne({
          where: { submissionId: parseInt(submissionId), logType: logType as LogType },
        });

        if (existing) {
          const existingMeta = (existing.meta as any[]) || [];
          const updatedMeta = [...existingMeta, ...allMeta];

          await this.proctoringLogRepository.update(
            { id: existing.id },
            { meta: JSON.parse(JSON.stringify(updatedMeta)) },
          );

          return {
            id: existing.id,
            logType: existing.logType,
            submissionId: existing.submissionId,
          };
        }

        const newLog = this.proctoringLogRepository.create({
          logType: logType as LogType,
          submissionId: parseInt(submissionId),
          meta: JSON.parse(JSON.stringify(allMeta)),
        });

        const savedLog = await this.proctoringLogRepository.save(newLog);

        return {
          id: savedLog.id,
          logType: savedLog.logType,
          submissionId: savedLog.submissionId,
        };
      }),
    );

    return results;
  }

  async getLogs(submissionId: number, teacherId: number) {
    await this.verifyTeacherOwnership(submissionId, teacherId);

    const logs = await this.proctoringLogRepository.find({ where: { submissionId } });

    return logs.map((log) => ({
      ...log,
      metaLength: Array.isArray(log.meta) ? log.meta.length : 0,
    }));
  }

  async clearLogsForSubmission(submissionId: number, teacherId: number) {
    await this.verifyTeacherOwnership(submissionId, teacherId);

    const logs = await this.proctoringLogRepository.find({
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

    const deleteResult = await this.proctoringLogRepository.delete({ submissionId });

    return {
      logsDeleted: deleteResult.affected || 0,
      imagesAttempted: fileIds.length,
      imageDeletionResults: deleteResults,
      message: `Deleted ${deleteResult.affected || 0} log(s) and attempted to remove ${fileIds.length} image(s) for submission ${submissionId}.`,
    };
  }
}
