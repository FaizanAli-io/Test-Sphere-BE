import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Test,
  Question,
  Submission,
  Answer,
  User,
  TestStatus,
  QuestionType,
  GradingStatus,
  SubmissionStatus,
} from "../typeorm/entities";

import { SubmitTestDto, StartSubmissionDto, GradeSubmissionDto } from "./submission.dto";
import { ProctoringLogService } from "../procotoring-log/procotoring-log.service";

@Injectable()
export class SubmissionService {
  constructor(
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private proctoringLogService: ProctoringLogService,
  ) {}

  private async ensureTeacherOwnsSubmission(teacherId: number, submissionId: number) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: { test: { class: true } },
    });

    if (!submission) throw new NotFoundException("Submission not found");
    if (submission.test.class.teacherId !== teacherId)
      throw new ForbiddenException("Not authorized");

    return submission;
  }

  async startTest(userId: number, dto: StartSubmissionDto) {
    const test = await this.testRepository.findOne({
      where: { id: dto.testId },
      select: { id: true, startAt: true, endAt: true, status: true },
    });

    if (!test) throw new NotFoundException("Test not found");
    if (test.status !== TestStatus.ACTIVE) throw new BadRequestException("Test is not active");

    const now = new Date();

    if (now < test.startAt) {
      const diffMs = test.startAt.getTime() - now.getTime();
      const minutes = Math.ceil(diffMs / 60000);
      throw new BadRequestException(`Test starts in ${minutes} minutes`);
    }

    if (now > test.endAt) {
      const diffMs = now.getTime() - test.endAt.getTime();
      const minutes = Math.ceil(diffMs / 60000);
      throw new BadRequestException(`Test ended ${minutes} minutes ago`);
    }

    const existing = await this.submissionRepository.findOne({
      where: { userId, testId: dto.testId },
    });
    if (existing) throw new BadRequestException("Submission already exists for this test");

    const submission = this.submissionRepository.create({
      userId,
      testId: dto.testId,
      startedAt: new Date(),
      status: SubmissionStatus.IN_PROGRESS,
    });

    return this.submissionRepository.save(submission);
  }

  async submitTest(userId: number, dto: SubmitTestDto) {
    const submission = await this.submissionRepository.findOne({
      where: { userId, status: SubmissionStatus.IN_PROGRESS },
      relations: { test: true },
      select: { id: true, test: { id: true } },
    });
    if (!submission) throw new NotFoundException("Active submission not found");

    const questions = await this.questionRepository.find({
      where: { testId: submission.test.id },
      select: { id: true, type: true, correctAnswer: true, maxMarks: true },
    });

    const answersData = dto.answers.map((ans) => {
      const question = questions.find((q) => q.id === ans.questionId);
      if (!question) throw new BadRequestException(`Question ${ans.questionId} not found`);

      let obtainedMarks: number | null = null;
      let gradingStatus: GradingStatus = GradingStatus.PENDING;

      if (
        question.type === QuestionType.TRUE_FALSE ||
        question.type === QuestionType.MULTIPLE_CHOICE
      ) {
        obtainedMarks = question.correctAnswer?.toString() === ans.answer ? question.maxMarks : 0;
        gradingStatus = GradingStatus.AUTOMATIC;
      }

      const answerEntity = new Answer();
      answerEntity.studentId = userId;
      answerEntity.questionId = ans.questionId;
      answerEntity.submissionId = submission.id;
      answerEntity.answer = ans.answer || null;
      answerEntity.obtainedMarks = obtainedMarks;
      answerEntity.gradingStatus = gradingStatus;
      return answerEntity;
    });

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Save all answers
      await queryRunner.manager.save(answersData);

      // Update submission status
      await queryRunner.manager.update(
        Submission,
        { id: submission.id },
        {
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.getSubmissionWithDetails(submission.id);
  }

  async gradeSubmission(teacherId: number, submissionId: number, dto: GradeSubmissionDto) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const a of dto.answers) {
        await queryRunner.manager.update(
          Answer,
          { id: a.answerId },
          { obtainedMarks: a.obtainedMarks },
        );
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return this.getSubmissionWithDetails(submissionId);
  }

  async updateSubmissionStatus(teacherId: number, submissionId: number, status: SubmissionStatus) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);

    const submission = await this.submissionRepository.findOne({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException("Submission not found");

    submission.status = status;
    if (status === SubmissionStatus.GRADED) submission.gradedAt = new Date();
    else if (status === SubmissionStatus.SUBMITTED) submission.gradedAt = null;

    await this.submissionRepository.save(submission);
    return this.getSubmissionWithDetails(submissionId);
  }

  async getSubmissionsForTest(teacherId: number, testId: number) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: { class: true },
      select: { class: { teacherId: true } },
    });

    if (!test) throw new NotFoundException("Test not found");
    if (test.class.teacherId !== teacherId) throw new ForbiddenException("Not authorized");

    return this.submissionRepository.find({
      where: { testId },
      relations: {
        answers: { question: true },
        user: true,
        test: { class: true },
      },
      order: { submittedAt: "ASC" },
    });
  }

  async getSubmissionsByStudent(studentId: number) {
    const exists = await this.userRepository.findOne({
      where: { id: studentId },
    });
    if (!exists) throw new NotFoundException("Student not found");

    return this.submissionRepository.find({
      where: { userId: studentId },
      relations: {
        answers: { question: true },
        user: true,
        test: { class: true },
      },
      order: { submittedAt: "DESC" },
    });
  }

  async getSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    return this.getSubmissionWithDetails(submissionId);
  }

  async deleteSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    await this.proctoringLogService.clearLogsForSubmission(submissionId, teacherId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(Answer, { submissionId });
      await queryRunner.manager.delete(Submission, { id: submissionId });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { success: true };
  }

  private async getSubmissionWithDetails(submissionId: number) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: {
        answers: { question: true },
        user: true,
        test: { class: true },
      },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission;
  }
}
