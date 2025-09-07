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
    },
    class: {
      findFirst: jest.fn(),
    },
    question: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
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
});
