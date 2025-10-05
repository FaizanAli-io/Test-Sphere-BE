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

  async startTest(userId: number, dto: StartSubmissionDto) {
    const test = await this.prisma.test.findUnique({
      where: { id: dto.testId },
      include: { questions: true },
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
        status: SubmissionStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });
  }

  async submitTest(userId: number, dto: SubmitTestDto) {
    const submission = await this.prisma.submission.findFirst({
      where: { userId, status: SubmissionStatus.IN_PROGRESS },
      include: { test: true },
    });

    if (!submission) throw new NotFoundException('Active submission not found');

    const { test } = submission;
    const questions = await this.prisma.question.findMany({
      where: { testId: test.id },
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

    await this.prisma.answer.createMany({ data: answersData });

    return this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: { answers: true },
    });
  }

  async gradeSubmission(
    teacherId: number,
    submissionId: number,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        test: {
          include: { class: true },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.test.class.teacherId !== teacherId)
      throw new ForbiddenException('Not authorized to grade this submission');

    await Promise.all(
      dto.answers.map(async (a) =>
        this.prisma.answer.update({
          where: { id: a.answerId },
          data: {
            obtainedMarks: a.obtainedMarks,
            gradingStatus: GradingStatus.GRADED,
          },
        }),
      ),
    );

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.GRADED,
        gradedAt: new Date(),
      },
      include: { answers: true },
    });
  }

  async getSubmissionsForTest(teacherId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });
    if (!test) throw new NotFoundException('Test not found');
    if (test.class.teacherId !== teacherId)
      throw new ForbiddenException('Not authorized');

    return this.prisma.submission.findMany({
      where: { testId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        answers: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
