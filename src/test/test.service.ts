import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTestDto,
  AddQuestionsDto,
  SubmitQuestionsDto,
  EditTestDto,
} from './dto/test.dto';
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

  async submitQuestions(
    userId: number,
    submitQuestionsDto: SubmitQuestionsDto,
  ) {
    // Check if all questions belong to tests that the teacher owns
    const testIds = [
      ...new Set(submitQuestionsDto.questions.map((q) => q.testId)),
    ];

    for (const testId of testIds) {
      const test = await this.prisma.test.findUnique({
        where: { id: testId },
        include: { class: true },
      });

      if (!test) {
        throw new NotFoundException(`Test with ID ${testId} not found`);
      }

      if (test.class?.teacherId !== userId) {
        throw new ForbiddenException(
          'You can only add questions to your own tests',
        );
      }
    }

    // Create questions in bulk
    await this.prisma.question.createMany({
      data: submitQuestionsDto.questions.map((q) => ({
        testId: q.testId,
        text: q.text,
        type: q.type,
        options: q.options,
        image: q.image || null,
        answer: q.answer,
        marks: q.points,
      })),
    });

    return { message: 'All questions submitted successfully!' };
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

  async submitTestLogs(userId: number, testId: number, logsData: any) {
    // Verify test exists and user has access
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    // Create activity log
    await this.prisma.activityLog.create({
      data: {
        userId,
        testId,
        classId: test.classId || 0,
        logs: logsData,
      },
    });

    return { message: 'Logs submitted successfully' };
  }

  async getTestLogs(userId: number, testId: number, studentId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if requesting user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('Only the test creator can view logs');
    }

    const logs = await this.prisma.activityLog.findMany({
      where: {
        testId,
        userId: studentId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return logs;
  }

  async checkTestSubmission(userId: number, testId: number) {
    const submission = await this.prisma.testSubmission.findUnique({
      where: {
        userId_testId: {
          userId,
          testId,
        },
      },
    });

    return {
      hasSubmitted: !!submission,
      submissionId: submission?.id || null,
      startTime: submission?.startTime || null,
      answersSubmitted: submission?.answersSubmitted || false,
      photosSubmitted: submission?.photosSubmitted || false,
    };
  }

  async getTestResult(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        questions: {
          include: {
            answerMarks: {
              where: { studentId: userId },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    const submission = await this.prisma.testSubmission.findUnique({
      where: {
        userId_testId: {
          userId,
          testId,
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('No submission found for this test');
    }

    const totalMarks = test.questions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0,
    );
    const obtainedMarks = test.questions.reduce(
      (sum, q) => sum + (q.answerMarks[0]?.obtainedMarks || 0),
      0,
    );

    return {
      testTitle: test.title,
      totalMarks,
      obtainedMarks,
      percentage: totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0,
      questions: test.questions.map((q) => ({
        id: q.id,
        text: q.text,
        marks: q.marks,
        obtainedMarks: q.answerMarks[0]?.obtainedMarks || 0,
      })),
    };
  }

  async markAnswer(
    userId: number,
    {
      testId,
      studentId,
      questionId,
      obtainedMarks,
      totalMarks,
    }: {
      testId: number;
      studentId: number;
      questionId: number;
      obtainedMarks: number;
      totalMarks: number;
    },
  ) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('Only the test creator can mark answers');
    }

    // Create or update answer mark
    await this.prisma.answerMark.upsert({
      where: {
        testId_studentId_questionId: {
          testId,
          studentId,
          questionId,
        },
      },
      update: {
        obtainedMarks,
        totalMarks,
      },
      create: {
        testId,
        studentId,
        questionId,
        obtainedMarks,
        totalMarks,
      },
    });

    return { message: 'Answer marked successfully' };
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

  async getTestDuration(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    return { duration: test.duration };
  }

  async submitTestAnswers(
    userId: number,
    testId: number,
    {
      studentId,
      answers,
      classId,
    }: { studentId: number; answers: any[]; classId: number },
  ) {
    // Verify test exists and user has access
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    // Submit answers
    await this.prisma.$transaction(
      answers.map((answer) =>
        this.prisma.testAnswer.create({
          data: {
            studentId,
            testId,
            questionId: answer.questionId,
            answer: answer.answer,
          },
        }),
      ),
    );

    return { message: 'Test answers submitted successfully' };
  }

  async submitTestPhotos(
    userId: number,
    testId: number,
    {
      studentId,
      photos,
      classId,
    }: { studentId: number; photos: any[]; classId: number },
  ) {
    // Verify test exists and user has access
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    // Convert base64 photos to Buffer
    const photoBuffers = photos.map((photo) =>
      Buffer.from(
        photo.photo.replace(/^data:image\/\w+;base64,/, ''),
        'base64',
      ),
    );

    // Save photos
    await this.prisma.testPhoto.upsert({
      where: {
        userId_testId: {
          userId: studentId,
          testId,
        },
      },
      update: {
        photos: photoBuffers,
        timestamp: new Date(),
      },
      create: {
        userId: studentId,
        testId,
        photos: photoBuffers,
        screenshots: [],
        timestamp: new Date(),
      },
    });

    return { message: 'Photos submitted successfully' };
  }

  async submitTestScreenshots(
    userId: number,
    testId: number,
    {
      studentId,
      screenshots,
      classId,
    }: { studentId: number; screenshots: any[]; classId: number },
  ) {
    // Verify test exists and user has access
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    // Convert base64 screenshots to Buffer
    const screenshotBuffers = screenshots.map((screenshot) =>
      Buffer.from(screenshot.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
    );

    // Save screenshots
    await this.prisma.testPhoto.upsert({
      where: {
        userId_testId: {
          userId: studentId,
          testId,
        },
      },
      update: {
        screenshots: screenshotBuffers,
        timestamp: new Date(),
      },
      create: {
        userId: studentId,
        testId,
        photos: [],
        screenshots: screenshotBuffers,
        timestamp: new Date(),
      },
    });

    return { message: 'Screenshots submitted successfully' };
  }

  async getTestMedia(userId: number, testId: number, studentId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher of this test
    if (test.class?.teacherId !== userId) {
      throw new ForbiddenException('Only the test creator can view media');
    }

    const media = await this.prisma.testPhoto.findUnique({
      where: {
        userId_testId: {
          userId: studentId,
          testId,
        },
      },
    });

    if (!media) {
      return { photos: [], screenshots: [] };
    }

    // Convert buffers back to base64 for transmission
    const photos = media.photos.map((photo, index) => ({
      id: index,
      photo: `data:image/jpeg;base64,${Buffer.from(photo).toString('base64')}`,
      timestamp: media.timestamp,
    }));

    const screenshots = media.screenshots.map((screenshot, index) => ({
      id: index,
      screenshot: `data:image/jpeg;base64,${Buffer.from(screenshot).toString('base64')}`,
      timestamp: media.timestamp,
    }));

    return { photos, screenshots };
  }

  async getTestResults(userId: number, testId: number) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        class: true,
        questions: {
          include: {
            answerMarks: {
              where: { studentId: userId },
            },
          },
        },
      },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    const hasAccess = await this.checkTestAccess(userId, test.classId || 0);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this test');
    }

    const totalMarks = test.questions.reduce(
      (sum, q) => sum + (q.marks || 0),
      0,
    );
    const obtainedMarks = test.questions.reduce(
      (sum, q) => sum + (q.answerMarks[0]?.obtainedMarks || 0),
      0,
    );

    return {
      testId,
      testTitle: test.title,
      totalMarks,
      obtainedMarks,
      percentage: totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0,
      results: test.questions.map((q) => ({
        questionId: q.id,
        question: q.text,
        totalMarks: q.marks,
        obtainedMarks: q.answerMarks[0]?.obtainedMarks || 0,
      })),
    };
  }

  async unsubmitTest(
    userId: number,
    testId: number,
    { studentId, classId }: { studentId: number; classId: number },
  ) {
    // Verify test exists and user has access
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: { class: true },
    });

    if (!test) {
      throw new NotFoundException('Test not found');
    }

    // Check if user is the teacher or the student themselves
    const isTeacher = test.class?.teacherId === userId;
    const isOwnSubmission = userId === studentId;

    if (!isTeacher && !isOwnSubmission) {
      throw new ForbiddenException(
        'You can only unsubmit your own test or if you are the teacher',
      );
    }

    // Delete test submission and related data
    await this.prisma.$transaction(async (prisma) => {
      // Delete answers
      await prisma.testAnswer.deleteMany({
        where: {
          testId,
          studentId,
        },
      });

      // Delete submission
      await prisma.testSubmission.deleteMany({
        where: {
          testId,
          userId: studentId,
        },
      });

      // Delete photos/screenshots
      await prisma.testPhoto.deleteMany({
        where: {
          testId,
          userId: studentId,
        },
      });

      // Delete activity logs
      await prisma.activityLog.deleteMany({
        where: {
          testId,
          userId: studentId,
        },
      });

      // Delete answer marks
      await prisma.answerMark.deleteMany({
        where: {
          testId,
          studentId,
        },
      });
    });

    return { message: 'Test submission removed successfully' };
  }
}
