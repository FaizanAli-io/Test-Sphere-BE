import { Test, TestingModule } from '@nestjs/testing';
import { TestService } from '../src/test/test.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole, TestStatus, QuestionType } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
} from '../src/test/dto/test.dto';

describe('TestService', () => {
  let service: TestService;
  let prisma: PrismaService;

  const mockPrisma = {
    class: {
      findUnique: jest.fn(),
    },
    test: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TestService>(TestService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('parseDate', () => {
    it('should convert string to Date', () => {
      const dateStr = '2025-10-01T00:00:00Z';
      const result = service.parseDate(dateStr);
      expect(result).toBeInstanceOf(Date);
    });

    it('should return undefined if input is undefined', () => {
      expect(service.parseDate(undefined)).toBeUndefined();
    });
  });

  describe('createTest', () => {
    const dto: CreateTestDto = {
      classId: 1,
      title: 'Math Test',
      description: 'Basic algebra test',
      duration: 60,
      startAt: '2025-10-01T10:00:00Z',
      endAt: '2025-10-01T11:00:00Z',
      status: TestStatus.DRAFT,
    };

    it('should throw if user is not a teacher', async () => {
      await expect(
        service.createTest(dto, 5, UserRole.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.createTest(dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not class owner', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 2 });
      await expect(
        service.createTest(dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create test for class owner', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 1 });
      mockPrisma.test.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.createTest(dto, 1, UserRole.TEACHER);
      expect(result).toEqual({ id: 1, ...dto });
      expect(mockPrisma.test.create).toHaveBeenCalled();
    });
  });

  describe('getTestById', () => {
    it('should throw if not found', async () => {
      mockPrisma.test.findUnique.mockResolvedValue(null);
      await expect(service.getTestById(1)).rejects.toThrow(NotFoundException);
    });

    it('should return test with questions', async () => {
      const mockTest = { id: 1, title: 'Math', questions: [] };
      mockPrisma.test.findUnique.mockResolvedValue(mockTest);
      const result = await service.getTestById(1);
      expect(result).toEqual(mockTest);
    });
  });

  describe('getTestsByClassId', () => {
    it('should return all tests for class', async () => {
      const mockTests = [
        { id: 1, title: 'T1' },
        { id: 2, title: 'T2' },
      ];
      mockPrisma.test.findMany.mockResolvedValue(mockTests);
      const result = await service.getTestsByClassId(1);
      expect(result).toEqual(mockTests);
    });
  });

  describe('updateTest', () => {
    const dto: UpdateTestDto = { title: 'Updated Title' };

    it('should throw if test not found', async () => {
      mockPrisma.test.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTest(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not teacher or not owner', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 2 },
      });
      await expect(
        service.updateTest(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 1 },
      });
      mockPrisma.test.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.updateTest(1, dto, 1, UserRole.TEACHER);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('deleteTest', () => {
    it('should throw if test not found', async () => {
      mockPrisma.test.findUnique.mockResolvedValue(null);
      await expect(service.deleteTest(1, 1, UserRole.TEACHER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if not owner', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 2 },
      });
      await expect(service.deleteTest(1, 1, UserRole.TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should delete successfully', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 1 },
      });
      mockPrisma.test.delete.mockResolvedValue({});
      const result = await service.deleteTest(1, 1, UserRole.TEACHER);
      expect(result).toEqual({ message: 'Test deleted successfully' });
    });
  });

  describe('getQuestionsByTestId', () => {
    it('should throw if no questions found', async () => {
      mockPrisma.question.findMany.mockResolvedValue([]);
      await expect(service.getQuestionsByTestId(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return questions', async () => {
      const mockQs = [{ id: 1, text: 'Q1' }];
      mockPrisma.question.findMany.mockResolvedValue(mockQs);
      const result = await service.getQuestionsByTestId(1);
      expect(result).toEqual(mockQs);
    });
  });

  describe('addQuestions', () => {
    const dto: AddQuestionsDto = {
      questions: [
        {
          testId: 1,
          text: '2 + 2 = ?',
          type: QuestionType.MULTIPLE_CHOICE,
          options: ['3', '4', '5'],
          correctAnswer: 1,
        },
      ],
    };

    it('should throw if test not found', async () => {
      mockPrisma.test.findUnique.mockResolvedValue(null);
      await expect(
        service.addQuestions(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 99 },
      });
      await expect(
        service.addQuestions(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create questions when authorized', async () => {
      mockPrisma.test.findUnique.mockResolvedValue({
        id: 1,
        class: { teacherId: 1 },
      });
      mockPrisma.$transaction.mockResolvedValue(dto.questions);
      const result = await service.addQuestions(1, dto, 1, UserRole.TEACHER);
      expect(result).toEqual(dto.questions);
    });
  });

  describe('updateQuestion', () => {
    const dto: UpdateQuestionDto = { text: 'Updated Question' };

    it('should throw if question not found', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);
      await expect(
        service.updateQuestion(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 2 } },
      });
      await expect(
        service.updateQuestion(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update question if owner', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 1 } },
      });
      mockPrisma.question.update.mockResolvedValue({ id: 1, ...dto });
      const result = await service.updateQuestion(1, dto, 1, UserRole.TEACHER);
      expect(result).toEqual({ id: 1, ...dto });
    });
  });

  describe('removeQuestion', () => {
    it('should throw if not found', async () => {
      mockPrisma.question.findUnique.mockResolvedValue(null);
      await expect(
        service.removeQuestion(1, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 99 } },
      });
      await expect(
        service.removeQuestion(1, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete if owner', async () => {
      mockPrisma.question.findUnique.mockResolvedValue({
        id: 1,
        test: { class: { teacherId: 1 } },
      });
      mockPrisma.question.delete.mockResolvedValue({});
      const result = await service.removeQuestion(1, 1, UserRole.TEACHER);
      expect(result).toEqual({ message: 'Question removed successfully' });
    });
  });
});
