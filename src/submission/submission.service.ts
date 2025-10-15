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

  private readonly submissionDetailsInclude = {
    user: { select: { id: true, name: true, email: true } },
    test: { include: { class: { select: { id: true, name: true } } } },
    answers: { include: { question: true } },
  } as const;

  private async ensureTeacherOwnsSubmission(
    teacherId: number,
    submissionId: number,
  ): Promise<boolean> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { test: { include: { class: true } } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.test.class.teacherId !== teacherId)
      throw new ForbiddenException('Not authorized');
    return true;
  }

  private async getSubmissionWithDetails(submissionId: number) {
    return this.prisma.submission.findUnique({
      include: this.submissionDetailsInclude,
      where: { id: submissionId },
    });
  }

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
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);

    await Promise.all(
      dto.answers.map(async (a) =>
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
    if (status === SubmissionStatus.GRADED) {
      data.gradedAt = new Date();
    } else if (status === SubmissionStatus.SUBMITTED) {
      data.gradedAt = null;
    }

    await this.prisma.submission.update({ where: { id: submissionId }, data });
    return this.getSubmissionWithDetails(submissionId);
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
      include: this.submissionDetailsInclude,
      orderBy: { submittedAt: 'desc' },
      where: { testId },
    });
  }

  async getSubmissionsByStudent(studentId: number) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const submissions = await this.prisma.submission.findMany({
      include: this.submissionDetailsInclude,
      orderBy: { submittedAt: 'desc' },
      where: { userId: studentId },
    });

    return submissions;
  }

  async getSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    return this.getSubmissionWithDetails(submissionId);
  }

  async deleteSubmission(teacherId: number, submissionId: number) {
    await this.ensureTeacherOwnsSubmission(teacherId, submissionId);
    await this.prisma.answer.deleteMany({ where: { submissionId } });
    await this.prisma.submission.delete({ where: { id: submissionId } });

    return { success: true };
  }
}
