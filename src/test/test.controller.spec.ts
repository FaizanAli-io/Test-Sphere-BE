import { Test, TestingModule } from '@nestjs/testing';
import { TestController } from './test.controller';
import { TestService } from './test.service';
import {
  CreateTestDto,
  SubmitQuestionsDto,
  EditTestDto,
  QuestionType,
} from './dto/test.dto';
import {
  StartTestDto,
  SubmitTestDto,
  GradeSubmissionDto,
  SubmitTestPhotosDto,
} from './dto/test-submission.dto';

describe('TestController', () => {
  let controller: TestController;
  let service: TestService;

  const mockTestService = {
    createTest: jest.fn(),
    getTest: jest.fn(),
    startTest: jest.fn(),
    submitTest: jest.fn(),
    submitPhotos: jest.fn(),
    gradeSubmission: jest.fn(),
    submitQuestions: jest.fn(),
    getTestsByClass: jest.fn(),
    editTest: jest.fn(),
    deleteTest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        {
          provide: TestService,
          useValue: mockTestService,
        },
      ],
    }).compile();

    controller = module.get<TestController>(TestController);
    service = module.get<TestService>(TestService);
  });

  describe('createTest', () => {
    it('should create a test', async () => {
      const createTestDto: CreateTestDto = {
        title: 'Test Title',
        description: 'Test Description',
        duration: 60,
        date: new Date(),
        classId: 1,
      };

      const userId = 1;

      const expectedResult = {
        id: 1,
        ...createTestDto,
      };

      mockTestService.createTest.mockResolvedValue(expectedResult);

      const result = await controller.createTest(userId, createTestDto);

      expect(result).toBe(expectedResult);
      expect(mockTestService.createTest).toHaveBeenCalledWith(
        userId,
        createTestDto,
      );
    });
  });

  describe('getTest', () => {
    it('should get a test by id', async () => {
      const testId = 1;
      const userId = 1;

      const expectedResult = {
        id: testId,
        title: 'Test Title',
        description: 'Test Description',
      };

      mockTestService.getTest.mockResolvedValue(expectedResult);

      const result = await controller.getTest(userId, testId);

      expect(result).toBe(expectedResult);
      expect(mockTestService.getTest).toHaveBeenCalledWith(userId, testId);
    });
  });

  describe('startTest', () => {
    it('should start a test', async () => {
      const startTestDto: StartTestDto = {
        testId: 1,
      };

      const userId = 1;

      const expectedResult = {
        id: 1,
        userId,
        testId: startTestDto.testId,
        startTime: new Date(),
      };

      mockTestService.startTest.mockResolvedValue(expectedResult);

      const result = await controller.startTest(userId, startTestDto.testId);

      expect(result).toBe(expectedResult);
      expect(mockTestService.startTest).toHaveBeenCalledWith(userId, {
        testId: startTestDto.testId,
      });
    });
  });

  describe('submitTest', () => {
    it('should submit a test', async () => {
      const submitTestDto: SubmitTestDto = {
        submissionId: 1,
        answers: [
          { questionId: 1, answer: 'Answer 1' },
          { questionId: 2, answer: 'Answer 2' },
        ],
      };

      const userId = 1;

      const expectedResult = {
        message: 'Test submitted successfully',
      };

      mockTestService.submitTest.mockResolvedValue(expectedResult);

      const result = await controller.submitTest(userId, submitTestDto);

      expect(result).toBe(expectedResult);
      expect(mockTestService.submitTest).toHaveBeenCalledWith(
        userId,
        submitTestDto,
      );
    });
  });

  describe('submitPhotos', () => {
    it('should submit photos', async () => {
      const submitPhotosDto: SubmitTestPhotosDto = {
        submissionId: 1,
        photos: ['base64photo1', 'base64photo2'],
        screenshots: ['base64screenshot1'],
      };

      const userId = 1;

      const expectedResult = {
        message: 'Photos submitted successfully',
      };

      mockTestService.submitPhotos.mockResolvedValue(expectedResult);

      const result = await controller.submitPhotos(userId, submitPhotosDto);

      expect(result).toBe(expectedResult);
      expect(mockTestService.submitPhotos).toHaveBeenCalledWith(
        userId,
        submitPhotosDto,
      );
    });
  });

  describe('gradeSubmission', () => {
    it('should grade a submission', async () => {
      const submissionId = 1;
      const gradeData = {
        grades: [
          { questionId: 1, points: 5 },
          { questionId: 2, points: 3 },
        ],
        feedback: 'Good work!',
      };

      const gradeSubmissionDto: GradeSubmissionDto = {
        ...gradeData,
        submissionId,
      };

      const userId = 1;

      const expectedResult = {
        message: 'Test graded successfully',
      };

      mockTestService.gradeSubmission.mockResolvedValue(expectedResult);

      const result = await controller.gradeSubmission(
        userId,
        submissionId,
        gradeSubmissionDto,
      );

      expect(result).toBe(expectedResult);
      expect(mockTestService.gradeSubmission).toHaveBeenCalledWith(
        userId,
        gradeSubmissionDto,
      );
    });
  });

  describe('submitQuestions', () => {
    it('should submit questions', async () => {
      const submitQuestionsDto = {
        questions: [
          {
            testId: 1,
            text: 'What is 2+2?',
            type: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            answer: '4',
            points: 5,
          },
        ],
      };

      const userId = 1;

      const expectedResult = {
        message: 'All questions submitted successfully!',
      };

      mockTestService.submitQuestions.mockResolvedValue(expectedResult);

      const result = await controller.submitQuestions(
        userId,
        submitQuestionsDto,
      );

      expect(result).toBe(expectedResult);
      expect(mockTestService.submitQuestions).toHaveBeenCalledWith(
        userId,
        submitQuestionsDto,
      );
    });
  });

  describe('getTestsByClass', () => {
    it('should get tests by class', async () => {
      const classId = 1;
      const userId = 1;

      const expectedResult = [
        {
          id: 1,
          title: 'Test 1',
          description: 'Description 1',
          questions: [],
        },
      ];

      mockTestService.getTestsByClass.mockResolvedValue(expectedResult);

      const result = await controller.getTestsByClass(userId, classId);

      expect(result).toBe(expectedResult);
      expect(mockTestService.getTestsByClass).toHaveBeenCalledWith(
        userId,
        classId,
      );
    });
  });

  describe('editTest', () => {
    it('should edit test', async () => {
      const testId = 1;
      const userId = 1;
      const editTestDto = {
        title: 'Updated Test',
        description: 'Updated Description',
        duration: 90,
        questions: [],
      };

      const expectedResult = {
        message: 'Test and questions updated successfully!',
      };

      mockTestService.editTest.mockResolvedValue(expectedResult);

      const result = await controller.editTest(userId, testId, editTestDto);

      expect(result).toBe(expectedResult);
      expect(mockTestService.editTest).toHaveBeenCalledWith(
        userId,
        testId,
        editTestDto,
      );
    });
  });

  describe('deleteTest', () => {
    it('should delete test', async () => {
      const testId = 1;
      const userId = 1;

      const expectedResult = {
        message: 'Test and associated questions deleted successfully.',
      };

      mockTestService.deleteTest.mockResolvedValue(expectedResult);

      const result = await controller.deleteTest(userId, testId);

      expect(result).toBe(expectedResult);
      expect(mockTestService.deleteTest).toHaveBeenCalledWith(userId, testId);
    });
  });
});
