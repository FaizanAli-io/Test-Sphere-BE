import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
} from './dto/test.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  parseDate = (d?: string) => (d ? new Date(d) : undefined);

  async createTest(dto: CreateTestDto, userId: number, role: UserRole) {
    if (role !== UserRole.TEACHER) {
      throw new ForbiddenException('Only teachers can create tests.');
    }

    const classEntity = await this.prisma.class.findUnique({
      where: { id: dto.classId },
    });

    if (!classEntity) throw new NotFoundException('Class not found.');
    if (classEntity.teacherId !== userId)
      throw new ForbiddenException('You are not the owner of this class.');

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
      include: { questions: true },
    });

    if (!test) throw new NotFoundException('Test not found.');
    return test;
  }

  async getTestsByClassId(classId: number) {
    return this.prisma.test.findMany({
      where: { classId },
      include: { questions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTest(
    id: number,
    dto: UpdateTestDto,
    userId: number,
    role: UserRole,
  ) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!test) throw new NotFoundException('Test not found.');
    if (role !== UserRole.TEACHER || test.class.teacherId !== userId)
      throw new ForbiddenException('You are not allowed to edit this test.');

    return this.prisma.test.update({
      where: { id },
      data: {
        ...dto,
        startAt: this.parseDate(dto.startAt),
        endAt: this.parseDate(dto.endAt),
      },
    });
  }

  async deleteTest(id: number, userId: number, role: UserRole) {
    const test = await this.prisma.test.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!test) throw new NotFoundException('Test not found.');
    if (role !== UserRole.TEACHER || test.class.teacherId !== userId)
      throw new ForbiddenException('You are not allowed to delete this test.');

    await this.prisma.test.delete({ where: { id } });
    return { message: 'Test deleted successfully' };
  }

  async getQuestionsByTestId(testId: number) {
    const questions = await this.prisma.question.findMany({
      where: { testId },
    });

    if (!questions.length)
      throw new NotFoundException('No questions found for this test.');
    return questions;
  }

  async addQuestions(
    testId: number,
    dto: AddQuestionsDto,
    userId: number,
    role: UserRole,
  ) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) throw new NotFoundException('Test not found.');
    if (role !== UserRole.TEACHER || test.class.teacherId !== userId)
      throw new ForbiddenException('You cannot modify this test.');

    return this.prisma.$transaction(
      dto.questions.map((q) =>
        this.prisma.question.create({
          data: {
            ...q,
            testId,
          },
        }),
      ),
    );
  }

  async updateQuestion(
    id: number,
    dto: UpdateQuestionDto,
    userId: number,
    role: UserRole,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { test: { include: { class: true } } },
    });

    if (!question) throw new NotFoundException('Question not found.');
    if (role !== UserRole.TEACHER || question.test.class.teacherId !== userId)
      throw new ForbiddenException('You cannot edit this question.');

    return this.prisma.question.update({
      where: { id },
      data: dto,
    });
  }

  async removeQuestion(id: number, userId: number, role: UserRole) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { test: { include: { class: true } } },
    });

    if (!question) throw new NotFoundException('Question not found.');
    if (role !== UserRole.TEACHER || question.test.class.teacherId !== userId)
      throw new ForbiddenException('You cannot delete this question.');

    await this.prisma.question.delete({ where: { id } });
    return { message: 'Question removed successfully' };
  }
}
