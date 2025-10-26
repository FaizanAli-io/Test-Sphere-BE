import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
} from './test.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  private async ensureTeacherOwnsClass(userId: number, classId: number) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!classEntity) throw new NotFoundException('Class not found.');
    if (classEntity.teacherId !== userId)
      throw new ForbiddenException('You are not authorized for this class.');
  }

  private async ensureTeacherOwnsTest(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: { select: { teacherId: true } } },
    });

    if (!test) throw new NotFoundException('Test not found.');
    if (test.class.teacherId !== userId)
      throw new ForbiddenException('You cannot modify this test.');

    return test;
  }

  private async ensureTeacherOwnsQuestion(userId: number, questionId: number) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        test: {
          include: { class: { select: { teacherId: true } } },
        },
      },
    });

    if (!question) throw new NotFoundException('Question not found.');
    if (question.test.class.teacherId !== userId)
      throw new ForbiddenException('You cannot modify this question.');

    return question;
  }

  private validateDates(startAt?: string, endAt?: string) {
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      throw new BadRequestException('End date must be after start date.');
    }
  }

  private parseDate(date?: string) {
    return date ? new Date(date) : undefined;
  }

  async createTest(dto: CreateTestDto, userId: number) {
    await this.ensureTeacherOwnsClass(userId, dto.classId);
    this.validateDates(dto.startAt, dto.endAt);

    return this.prisma.test.create({
      data: {
        ...dto,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
      },
    });
  }

  async getTestById(id: number) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          select: { id: true, text: true, type: true, maxMarks: true },
        },
      },
    });

    if (!test) throw new NotFoundException('Test not found.');
    return test;
  }

  async getTestsByClassId(classId: number) {
    return this.prisma.test.findMany({
      orderBy: { createdAt: 'desc' },
      where: { classId },
    });
  }

  async updateTest(id: number, dto: UpdateTestDto, userId: number) {
    await this.ensureTeacherOwnsTest(userId, id);
    this.validateDates(dto.startAt, dto.endAt);

    return this.prisma.test.update({
      where: { id },
      data: {
        ...dto,
        startAt: this.parseDate(dto.startAt),
        endAt: this.parseDate(dto.endAt),
      },
    });
  }

  async deleteTest(id: number, userId: number) {
    await this.ensureTeacherOwnsTest(userId, id);

    await this.prisma.$transaction(async (tx) => {
      await tx.answer.deleteMany({ where: { question: { testId: id } } });
      await tx.question.deleteMany({ where: { testId: id } });
      await tx.submission.deleteMany({ where: { testId: id } });
      await tx.test.delete({ where: { id } });
    });

    return { message: 'Test deleted successfully' };
  }

  async getQuestionsByTestId(testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      select: { numQuestions: true },
    });

    const allQuestions = await this.prisma.question.findMany({
      where: { testId },
      select: {
        id: true,
        text: true,
        type: true,
        options: true,
        correctAnswer: true,
        maxMarks: true,
      },
      orderBy: { id: 'asc' },
    });

    if (!test?.numQuestions || test.numQuestions >= allQuestions.length) {
      return allQuestions;
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, test.numQuestions);

    return selected;
  }

  async addQuestions(testId: number, dto: AddQuestionsDto, userId: number) {
    await this.ensureTeacherOwnsTest(userId, testId);

    await this.prisma.$transaction(async (tx) => {
      for (const q of dto.questions) {
        await tx.question.create({ data: { ...q, testId } });
      }
    });

    return { message: 'Questions added successfully' };
  }

  async updateQuestion(id: number, dto: UpdateQuestionDto, userId: number) {
    await this.ensureTeacherOwnsQuestion(userId, id);

    return this.prisma.question.update({
      where: { id },
      data: dto,
    });
  }

  async removeQuestion(id: number, userId: number) {
    await this.ensureTeacherOwnsQuestion(userId, id);

    await this.prisma.question.delete({ where: { id } });
    return { message: 'Question removed successfully' };
  }
}
