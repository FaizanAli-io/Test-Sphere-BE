import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  SubmitTestDto,
  StartSubmissionDto,
  GradeSubmissionDto,
} from './submission.dto';
import {
  TestStatus,
  QuestionType,
  GradingStatus,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionService {
  constructor(private prisma: PrismaService) {}

  private readonly submissionInclude = {
    answers: { include: { question: true } },
    user: { select: { id: true, name: true, email: true } },
    test: { include: { class: { select: { id: true, name: true } } } },
  } as const;

  private async ensureTeacherOwnsSubmission(
    teacherId: number,
    submissionId: number,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { test: { include: { class: true } } },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.test.class.teacherId !== teacherId)
      throw new ForbiddenException('Not authorized');

    return submission;
  }

  async startTest(userId: number, dto: StartSubmissionDto) {
    const test = await this.prisma.test.findUnique({
      where: { id: dto.testId },
      select: { id: true, status: true },
    });

    if (!test) throw new NotFoundException('Test not found');
    if (test.status !== TestStatus.ACTIVE)
      throw new BadRequestException('Test is not active');

    const existing = await this.prisma.submission.findUnique({
      where: { userId_testId: { userId, testId: dto.testId } },
    });
    if (existing)
      throw new BadRequestException('Submission already exists for this test');

    return this.prisma.submission.create({
      data: {
        userId,
        testId: dto.testId,
        startedAt: new Date(),
        status: SubmissionStatus.IN_PROGRESS,
      },
    });
  }

  async submitTest(userId: number, dto: SubmitTestDto) {
    const submission = await this.prisma.submission.findFirst({
      where: { userId, status: SubmissionStatus.IN_PROGRESS },
      include: { test: { select: { id: true } } },
    });
    if (!submission) throw new NotFoundException('Active submission not found');

    const questions = await this.prisma.question.findMany({
      where: { testId: submission.test.id },
      select: { id: true, type: true, correctAnswer: true, maxMarks: true },
    });

    const answersData = dto.answers.map((ans) => {
      const question = questions.find((q) => q.id === ans.questionId);
      if (!question)
        throw new BadRequestException(`Question ${ans.questionId} not found`);

      let obtainedMarks: number | null = null;
      let gradingStatus: GradingStatus = GradingStatus.PENDING;

      if (
        question.type === QuestionType.TRUE_FALSE ||
        question.type === QuestionType.MULTIPLE_CHOICE
      ) {
        obtainedMarks =
          question.correctAnswer?.toString() === ans.answer
            ? question.maxMarks
            : 0;
        gradingStatus = GradingStatus.AUTOMATIC;
      }

      return {
        studentId: userId,
        questionId: ans.questionId,
        submissionId: submission.id,
        answer: ans.answer,
        obtainedMarks,
        gradingStatus,
      };
    });

    await this.prisma.$transaction([
      this.prisma.answer.createMany({ data: answersData }),
      this.prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
        },
      }),
    ]);

    return this.getSubmissionWithDetails(submission.id);
  }

  async gradeSubmission(
    teacherId: number,
    submissionId: number,
    dto: GradeSubmissionDto,
  ) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);

    await this.prisma.$transaction(
      dto.answers.map((a) =>
        this.prisma.answer.update({
          where: { id: a.answerId },
          data: { obtainedMarks: a.obtainedMarks },
        }),
      ),
    );

    return this.getSubmissionWithDetails(submissionId);
  }

  async updateSubmissionStatus(
    teacherId: number,
    submissionId: number,
    status: SubmissionStatus,
  ) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);

    const data: any = { status };
    if (status === SubmissionStatus.GRADED) data.gradedAt = new Date();
    else if (status === SubmissionStatus.SUBMITTED) data.gradedAt = null;

    await this.prisma.submission.update({ where: { id: submissionId }, data });
    return this.getSubmissionWithDetails(submissionId);
  }

  async getSubmissionsForTest(teacherId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { class: { select: { teacherId: true } } },
    });

    if (!test) throw new NotFoundException('Test not found');
    if (test.class.teacherId !== teacherId)
      throw new ForbiddenException('Not authorized');

    return this.prisma.submission.findMany({
      where: { testId },
      include: this.submissionInclude,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getSubmissionsByStudent(studentId: number) {
    const exists = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!exists) throw new NotFoundException('Student not found');

    return this.prisma.submission.findMany({
      where: { userId: studentId },
      include: this.submissionInclude,
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    return this.getSubmissionWithDetails(submissionId);
  }

  async deleteSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    await this.prisma.$transaction([
      this.prisma.answer.deleteMany({ where: { submissionId } }),
      this.prisma.submission.delete({ where: { id: submissionId } }),
    ]);
    return { success: true };
  }

  private async getSubmissionWithDetails(submissionId: number) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: this.submissionInclude,
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }
}
