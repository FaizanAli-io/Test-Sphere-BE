import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import { SubmissionService } from '../src/submission/submission.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  QuestionType,
  SubmissionStatus,
  GradingStatus,
  TestStatus,
} from '@prisma/client';
import {
  StartSubmissionDto,
  SubmitTestDto,
  AnswerDto,
} from '../src/submission/submission.dto';

describe('SubmissionService', () => {
  let service: SubmissionService;
  let prisma: PrismaService;

  const mockPrisma = {
    submission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    test: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    answer: {
      createMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubmissionService>(SubmissionService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('startTest', () => {
    const dto: StartSubmissionDto = { testId: 1 };

    it('should throw if test not found', async () => {
      mockPrisma.test.findUnique.mockResolvedValue(null);
      await expect(service.startTest(1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if test is not active', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        status: TestStatus.CLOSED,
      });
      await expect(service.startTest(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if submission already exists', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        status: TestStatus.ACTIVE,
      });
      mockPrisma.submission.findUnique.mockResolvedValue({ id: 10 });
      await expect(service.startTest(1, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new submission successfully', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        status: TestStatus.ACTIVE,
      });
      mockPrisma.submission.findUnique.mockResolvedValue(null);
      mockPrisma.submission.create.mockResolvedValue({ id: 99 });
      const res = await service.startTest(1, dto);
      expect(res).toEqual({ id: 99 });
      expect(mockPrisma.submission.create).toHaveBeenCalled();
    });
  });

  describe('submitTest', () => {
    const answers: AnswerDto[] = [
      { questionId: 1, answer: 'A' },
      { questionId: 2, answer: 'true' },
      { questionId: 3, answer: 'My answer' },
    ];

    const dto: SubmitTestDto = { answers };

    const mockQuestions = [
      {
        id: 1,
        type: QuestionType.MULTIPLE_CHOICE,
        correctAnswer: 'A',
        options: ['A', 'B', 'C'],
        maxMarks: 2,
      },
      {
        id: 2,
        type: QuestionType.TRUE_FALSE,
        correctAnswer: 'true',
        options: ['false', 'true'],
        maxMarks: 1,
      },
      {
        id: 3,
        type: QuestionType.LONG_ANSWER,
        correctAnswer: null,
        options: [],
        maxMarks: 5,
      },
    ];

    const mockSubmission = {
      id: 1,
      testId: 10,
      userId: 1,
      status: SubmissionStatus.IN_PROGRESS,
      test: { id: 10 },
    };

    beforeEach(() => {
      mockPrisma.submission.findFirst.mockResolvedValue(mockSubmission);
      mockPrisma.question.findMany.mockResolvedValue(mockQuestions);
      mockPrisma.answer.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.submission.update.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.SUBMITTED,
      });
    });

    it('should throw if no active submission found', async () => {
      mockPrisma.submission.findFirst.mockResolvedValue(null);
      await expect(service.submitTest(1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should submit answers and auto-grade objective ones', async () => {
      const res = await service.submitTest(1, dto);
      expect(mockPrisma.answer.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            questionId: 1,
            gradingStatus: GradingStatus.AUTOMATIC,
          }),
          expect.objectContaining({
            questionId: 2,
            gradingStatus: GradingStatus.AUTOMATIC,
          }),
          expect.objectContaining({
            questionId: 3,
            gradingStatus: GradingStatus.PENDING,
          }),
        ]),
      });
      expect(res.status).toBe(SubmissionStatus.SUBMITTED);
      expect(mockPrisma.submission.update).toHaveBeenCalled();
    });
  });

  describe('gradeSubmission', () => {
    const dto = {
      answers: [
        { answerId: 1, obtainedMarks: 5 },
        { answerId: 2, obtainedMarks: 3 },
      ],
    };

    it('should throw if submission not found', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.gradeSubmission(1, 1, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if teacher not authorized', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 999 } },
      });
      await expect(service.gradeSubmission(1, 1, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update answers and mark submission graded', async () => {
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 1 } },
      });
      mockPrisma.answer.update.mockResolvedValue({});
      mockPrisma.submission.update.mockResolvedValue({
        id: 1,
        status: SubmissionStatus.GRADED,
      });

      const res = await service.gradeSubmission(1, 1, dto);
      expect(res.status).toBe(SubmissionStatus.GRADED);
      expect(mockPrisma.answer.update).toHaveBeenCalledTimes(
        dto.answers.length,
      );
      expect(mockPrisma.submission.update).toHaveBeenCalled();
    });
  });
});
