import { Test, TestingModule } from '@nestjs/testing';
import { TestService } from './test.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('TestService', () => {
  let service: TestService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    test: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    class: {
      findFirst: jest.fn(),
    },
    question: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    testSubmission: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    testAnswer: {
      create: jest.fn(),
    },
    testPhoto: {
      create: jest.fn(),
    },
    answerMark: {
      create: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      if (typeof callback === 'function') {
        return Promise.resolve(callback(mockPrismaService));
      }
      return Promise.resolve([]);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TestService>(TestService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createTest', () => {
    const createTestDto = {
      title: 'Test Title',
      description: 'Test Description',
      duration: 60,
      date: new Date(),
      classId: 1,
    };

    const userId = 1;

    it('should create a test when user is the class teacher', async () => {
      mockPrismaService.class.findFirst.mockResolvedValue({
        id: 1,
        teacherId: userId,
      });

      mockPrismaService.test.create.mockResolvedValue({
        id: 1,
        ...createTestDto,
      });

      const result = await service.createTest(userId, createTestDto);

      expect(result).toHaveProperty('id');
      expect(mockPrismaService.test.create).toHaveBeenCalledWith({
        data: createTestDto,
      });
    });

    it('should throw ForbiddenException when user is not the class teacher', async () => {
      mockPrismaService.class.findFirst.mockResolvedValue(null);

      await expect(service.createTest(userId, createTestDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('startTest', () => {
    const testId = 1;
    const userId = 1;
    const classId = 1;

    it('should create a test submission when valid', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId,
        class: { teacherId: 2 },
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: UserRole.student,
        studentClasses: [{ classId }],
      });

      mockPrismaService.testSubmission.findUnique.mockResolvedValue(null);

      mockPrismaService.testSubmission.create.mockResolvedValue({
        id: 1,
        userId,
        testId,
        classId,
        startTime: expect.any(Date),
      });

      const result = await service.startTest(userId, { testId });

      expect(result).toHaveProperty('id');
      expect(result.userId).toBe(userId);
      expect(result.testId).toBe(testId);
    });

    it('should throw BadRequestException when test is already started', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId,
      });

      mockPrismaService.testSubmission.findUnique.mockResolvedValue({
        id: 1,
        userId,
        testId,
      });

      await expect(service.startTest(userId, { testId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('submitTest', () => {
    const submissionId = 1;
    const userId = 1;
    const testId = 1;

    const submitDto = {
      submissionId,
      answers: [
        { questionId: 1, answer: 'Answer 1' },
        { questionId: 2, answer: 'Answer 2' },
      ],
    };

    it('should submit test answers successfully', async () => {
      mockPrismaService.testSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        userId,
        testId,
        startTime: new Date(),
        answersSubmitted: false,
        test: { duration: 60 },
      });

      mockPrismaService.testAnswer.create.mockResolvedValue({});
      mockPrismaService.testSubmission.update.mockResolvedValue({});

      const result = await service.submitTest(userId, submitDto);

      expect(result).toEqual({ message: 'Test submitted successfully' });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.testSubmission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { answersSubmitted: true },
      });
    });

    it('should throw ForbiddenException when submitting for another user', async () => {
      mockPrismaService.testSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        userId: 999, // Different user
        testId,
        startTime: new Date(),
        answersSubmitted: false,
        test: { duration: 60 },
      });

      await expect(service.submitTest(userId, submitDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('gradeSubmission', () => {
    const submissionId = 1;
    const teacherId = 1;
    const testId = 1;

    const gradeDto = {
      submissionId,
      grades: [
        { questionId: 1, points: 5 },
        { questionId: 2, points: 3 },
      ],
    };

    it('should grade submission successfully when teacher has access', async () => {
      const studentId = 2;
      const classId = 1;

      mockPrismaService.testSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        testId,
        userId: studentId,
        classId,
        answers: [],
        test: {
          id: testId,
          classId,
          class: {
            id: classId,
            teacherId,
          },
        },
      });

      mockPrismaService.class.findFirst.mockResolvedValue({
        id: classId,
        teacherId,
      });

      mockPrismaService.question.findUnique
        .mockResolvedValueOnce({
          id: 1,
          marks: 5,
        })
        .mockResolvedValueOnce({
          id: 2,
          marks: 3,
        });

      mockPrismaService.answerMark.create.mockResolvedValue({});
      mockPrismaService.activityLog.create.mockResolvedValue({});

      const result = await service.gradeSubmission(teacherId, {
        ...gradeDto,
        feedback: 'Good work!',
      });

      expect(result).toEqual({ message: 'Test graded successfully' });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.question.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.answerMark.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: studentId,
          testId,
          classId,
          logs: { feedback: 'Good work!' },
        }),
      });
    });

    it('should throw ForbiddenException when grader is not the teacher', async () => {
      mockPrismaService.testSubmission.findUnique.mockResolvedValue({
        id: submissionId,
        testId,
        userId: 2,
        test: {
          class: {
            teacherId: 999, // Different teacher
          },
        },
      });

      await expect(
        service.gradeSubmission(teacherId, gradeDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitQuestions', () => {
    const userId = 1;
    const submitQuestionsDto = {
      questions: [
        {
          testId: 1,
          text: 'What is 2+2?',
          type: 'MULTIPLE_CHOICE' as const,
          options: ['3', '4', '5', '6'],
          answer: '4',
          points: 5,
        },
        {
          testId: 1,
          text: 'The earth is round',
          type: 'TRUE_FALSE' as const,
          options: [],
          answer: 'true',
          points: 3,
        },
      ],
    };

    it('should submit questions successfully when user is teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: 1,
        classId: 1,
        class: { teacherId: userId },
      });

      mockPrismaService.question.createMany.mockResolvedValue({ count: 2 });

      const result = await service.submitQuestions(userId, submitQuestionsDto);

      expect(result).toEqual({
        message: 'All questions submitted successfully!',
      });
      expect(mockPrismaService.question.createMany).toHaveBeenCalledWith({
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
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: 1,
        classId: 1,
        class: { teacherId: 999 }, // Different teacher
      });

      await expect(
        service.submitQuestions(userId, submitQuestionsDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when test does not exist', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue(null);

      await expect(
        service.submitQuestions(userId, submitQuestionsDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTestsByClass', () => {
    const userId = 1;
    const classId = 1;

    it('should return tests with questions for authorized user', async () => {
      const mockTests = [
        {
          id: 1,
          title: 'Test 1',
          description: 'Description 1',
          date: new Date(),
          duration: 60,
          classId,
          questions: [{ id: 1, text: 'Question 1', type: 'MULTIPLE_CHOICE' }],
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'teacher',
        teacherClasses: [{ id: classId }],
      });

      mockPrismaService.test.findMany.mockResolvedValue(mockTests);

      const result = await service.getTestsByClass(userId, classId);

      expect(result).toEqual(mockTests);
      expect(mockPrismaService.test.findMany).toHaveBeenCalledWith({
        where: { classId },
        include: {
          questions: true,
        },
      });
    });

    it('should throw ForbiddenException when user has no access to class', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        role: 'student',
        studentClasses: [], // No access to this class
      });

      await expect(service.getTestsByClass(userId, classId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('editTest', () => {
    const userId = 1;
    const testId = 1;
    const editTestDto = {
      title: 'Updated Test',
      description: 'Updated Description',
      duration: 90,
      questions: [
        {
          id: 1,
          text: 'Updated Question',
          type: 'MULTIPLE_CHOICE' as const,
          points: 10,
        },
        {
          text: 'New Question',
          type: 'TRUE_FALSE' as const,
          points: 5,
        },
      ],
    };

    it('should edit test successfully when user is teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId: 1,
        class: { teacherId: userId },
      });

      mockPrismaService.test.update.mockResolvedValue({
        id: testId,
        ...editTestDto,
      });

      mockPrismaService.question.update.mockResolvedValue({});
      mockPrismaService.question.create.mockResolvedValue({});

      const result = await service.editTest(userId, testId, editTestDto);

      expect(result).toEqual({
        message: 'Test and questions updated successfully!',
      });
      expect(mockPrismaService.test.update).toHaveBeenCalledWith({
        where: { id: testId },
        data: {
          title: editTestDto.title,
          description: editTestDto.description,
          duration: editTestDto.duration,
        },
      });
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId: 1,
        class: { teacherId: 999 }, // Different teacher
      });

      await expect(
        service.editTest(userId, testId, editTestDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteTest', () => {
    const userId = 1;
    const testId = 1;

    it('should delete test successfully when user is teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId: 1,
        class: { teacherId: userId },
      });

      mockPrismaService.question.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.test.delete.mockResolvedValue({});

      const result = await service.deleteTest(userId, testId);

      expect(result).toEqual({
        message: 'Test and associated questions deleted successfully.',
      });
      expect(mockPrismaService.question.deleteMany).toHaveBeenCalledWith({
        where: { testId },
      });
      expect(mockPrismaService.test.delete).toHaveBeenCalledWith({
        where: { id: testId },
      });
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue({
        id: testId,
        classId: 1,
        class: { teacherId: 999 }, // Different teacher
      });

      await expect(service.deleteTest(userId, testId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when test does not exist', async () => {
      mockPrismaService.test.findUnique.mockResolvedValue(null);

      await expect(service.deleteTest(userId, testId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
