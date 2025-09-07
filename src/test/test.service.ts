import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestDto, AddQuestionsDto } from './dto/test.dto';
import {
  StartTestDto,
  SubmitTestDto,
  SubmitTestPhotosDto,
  GradeSubmissionDto,
} from './dto/test-submission.dto';
import { UserRole } from '../../generated/prisma';

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

    // Create the test
    const test = await this.prisma.test.create({
      data: {
        title: createTestDto.title,
        description: createTestDto.description,
        duration: createTestDto.duration,
        date: createTestDto.date,
        classId: createTestDto.classId,
      },
    });

    return test;
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

  async startTest(userId: number, { testId }: StartTestDto) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user has access to the test
    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    // Check if test is already started
    const existingSubmission = await this.prisma.testSubmission.findUnique({
      where: {
        userId_testId: {
          userId,
          testId,
        },
      },
    });

    if (existingSubmission) {
      throw new BadRequestException('You have already started this test');
    }

    // Create test submission
    const submission = await this.prisma.testSubmission.create({
      data: {
        userId,
        testId,
        classId: test.classId,
        startTime: new Date(),
      },
    });

    return submission;
  }

  async submitTest(userId: number, { submissionId, answers }: SubmitTestDto) {
    const submission = await this.prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: { test: true },
    });

    if (!submission) {
      throw new NotFoundException('Test submission not found');
    }

    if (submission.userId !== userId) {
      throw new ForbiddenException('This is not your test submission');
    }

    if (submission.answersSubmitted) {
      throw new BadRequestException('Test answers have already been submitted');
    }

    // Check if test time has expired
    const testEndTime = new Date(
      submission.startTime.getTime() + submission.test.duration * 60 * 1000,
    );
    if (new Date() > testEndTime) {
      throw new BadRequestException('Test time has expired');
    }

    // Submit answers
    await this.prisma.$transaction(
      answers.map((answer) =>
        this.prisma.testAnswer.create({
          data: {
            studentId: userId,
            testId: submission.testId,
            questionId: answer.questionId,
            answer: answer.answer,
          },
        }),
      ),
    );

    // Update submission status
    await this.prisma.testSubmission.update({
      where: { id: submissionId },
      data: { answersSubmitted: true },
    });

    return { message: 'Test submitted successfully' };
  }

  async submitPhotos(
    userId: number,
    { submissionId, photos, screenshots }: SubmitTestPhotosDto,
  ) {
    const submission = await this.prisma.testSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException('Test submission not found');
    }

    if (submission.userId !== userId) {
      throw new ForbiddenException('This is not your test submission');
    }

    if (submission.photosSubmitted) {
      throw new BadRequestException('Photos have already been submitted');
    }

    // Convert base64 to Buffer
    const photoBuffers =
      photos?.map((photo) => Buffer.from(photo, 'base64')) || [];
    const screenshotBuffers =
      screenshots?.map((ss) => Buffer.from(ss, 'base64')) || [];

    // Save photos
    await this.prisma.testPhoto.create({
      data: {
        userId,
        testId: submission.testId,
        photos: photoBuffers,
        screenshots: screenshotBuffers,
        timestamp: new Date(),
      },
    });

    // Update submission status
    await this.prisma.testSubmission.update({
      where: { id: submissionId },
      data: {
        photosSubmitted: true,
        screenshotsSubmitted: screenshots ? true : false,
      },
    });

    return { message: 'Photos submitted successfully' };
  }

  async gradeSubmission(
    teacherId: number,
    { submissionId, grades, feedback }: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.testSubmission.findUnique({
      where: { id: submissionId },
      include: { test: true },
    });

    if (!submission) {
      throw new NotFoundException('Test submission not found');
    }

    // Check if teacher has access to grade this test
    const hasAccess = await this.checkTestAccess(
      teacherId,
      submission.test.classId || 0,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have permission to grade this test',
      );
    }

    // Grade each answer
    await this.prisma.$transaction(async (prisma) => {
      for (const grade of grades) {
        const question = await prisma.question.findUnique({
          where: { id: grade.questionId },
        });

        await prisma.answerMark.create({
          data: {
            testId: submission.testId,
            studentId: submission.userId,
            questionId: grade.questionId,
            obtainedMarks: grade.points,
            totalMarks: question?.marks || grade.points, // Use question marks or awarded points as total
          },
        });
      }
    });

    // Add feedback if provided
    if (feedback) {
      await this.prisma.activityLog.create({
        data: {
          userId: submission.userId,
          testId: submission.testId,
          classId: submission.classId || 0,
          logs: { feedback },
        },
      });
    }

    return { message: 'Test graded successfully' };
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
