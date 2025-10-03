import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto, EditTestDto, AddQuestionsDto } from './dto/test.dto';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}

  async createTest(userId: number, createTestDto: CreateTestDto) {
    // Verify user is a teacher and belongs to the class
    const classTeacher = await this.prisma.class.findFirst({
      where: {
        id: createTestDto.classId,
        teacherId: userId,
      },
    });

    if (!classTeacher) {
      throw new ForbiddenException('Only the class teacher can create tests');
    }

    const test = await this.prisma.test.create({
      data: {
        classId: createTestDto.classId,
        title: createTestDto.title,
        duration: createTestDto.duration,
        date: new Date(createTestDto.date),
        description: createTestDto.description,
      },
    });

    return test;
  }

  async getTestsByClass(userId: number, classId: number) {
    // Check if user has access to this class
    const hasAccess = await this.checkTestAccess(userId, classId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this class');
    }

    return this.prisma.test.findMany({
      where: { classId },
      include: {
        questions: true,
      },
    });
  }

  async getTest(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        questions: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user has access (teacher or enrolled student)
    const hasAccess = await this.checkTestAccess(userId, test.classId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    return test;
  }

  async editTest(userId: number, testId: number, editTestDto: EditTestDto) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('You can only edit your own tests');
    }

    await this.prisma.$transaction(async (prisma) => {
      // Update test details
      await prisma.test.update({
        where: { id: testId },
        data: {
          title: editTestDto.title,
          description: editTestDto.description,
          duration: editTestDto.duration,
          date: editTestDto.date,
        },
      });

      // Update or create questions
      if (editTestDto.questions) {
        for (const question of editTestDto.questions) {
          if (question.id) {
            // Update existing question
            await prisma.question.update({
              where: { id: question.id },
              data: {
                text: question.text,
                type: question.type,
                marks: question.points,
                options: question.options,
                answer: question.correctAnswers?.[0],
              },
            });
          } else {
            // Create new question
            await prisma.question.create({
              data: {
                testId,
                text: question.text,
                type: question.type,
                marks: question.points,
                options: question.options,
                answer: question.correctAnswers?.[0],
              },
            });
          }
        }
      }
    });

    return { message: 'Test and questions updated successfully!' };
  }

  async deleteTest(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('You can only delete your own tests');
    }

    await this.prisma.$transaction(async (prisma) => {
      // Delete questions first (due to foreign key constraints)
      await prisma.question.deleteMany({
        where: { testId },
      });

      // Delete the test
      await prisma.test.delete({
        where: { id: testId },
      });
    });

    return { message: 'Test and associated questions deleted successfully.' };
  }

  async addQuestions(
    userId: number,
    testId: number,
    questionsDto: AddQuestionsDto,
  ) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('Only the test creator can add questions');
    }

    const questions = await this.prisma.question.createMany({
      data: questionsDto.questions.map((q) => ({
        ...q,
        testId,
      })),
    });

    return this.getTest(userId, testId);
  }

  async getTestQuestions(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        questions: {
          select: {
            id: true,
            text: true,
            type: true,
            options: true,
            image: true,
            marks: true,
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user has access to this test
    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    return {
      id: test.id,
      title: test.title,
      description: test.description,
      duration: test.duration,
      questions: test.questions,
    };
  }

  private async checkTestAccess(
    userId: number,
    classId: number | null,
  ): Promise<boolean> {
    // If no classId, only teachers can access
    if (!classId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      return user?.role === UserRole.teacher;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacherClasses: {
          where: { id: classId },
        },
        studentClasses: {
          where: { classId },
        },
      },
    });

    if (!user) return false;

    if (user.role === UserRole.teacher) {
      return user.teacherClasses.length > 0;
    } else {
      return user.studentClasses.length > 0;
    }
  }
}
