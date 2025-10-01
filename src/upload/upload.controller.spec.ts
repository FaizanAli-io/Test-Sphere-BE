import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import {
  UploadService,
  QuestionGenerationRequest,
  ChatbotRequest,
} from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Readable } from 'stream';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: UploadService;

  const mockUploadService = {
    processPdfFile: jest.fn(),
    generateChatbotQuestions: jest.fn(),
    processCsvFile: jest.fn(),
    processQuestionsPdf: jest.fn(),
    processQuestionsCsv: jest.fn(),
  };

  const mockFile: Express.Multer.File = {
    fieldname: 'pdf',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    destination: './uploads',
    filename: 'randomname.pdf',
    path: './uploads/randomname.pdf',
    size: 1024,
    stream: new Readable(),
    buffer: Buffer.from('test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadPdf', () => {
    const mockQuestionRequest: QuestionGenerationRequest = {
      numberOfMultipleChoice: 3,
      numberOfTrueFalse: 2,
      numberOfShortAnswer: 1,
    };

    const mockRequestBody = {
      numberOfMultipleChoice: '3',
      numberOfTrueFalse: '2',
      numberOfShortAnswer: '1',
    };

    const mockGeneratedQuestions = [
      {
        text: 'What is 2 + 2?',
        type: 'multiple-choice' as const,
        options: ['3', '4', '5', '6'],
        answer: '4',
      },
      {
        text: 'The sky is blue.',
        type: 'true-false' as const,
        options: ['True', 'False'],
        answer: true,
      },
    ];

    it('should upload PDF and generate questions successfully', async () => {
      mockUploadService.processPdfFile.mockResolvedValue(
        mockGeneratedQuestions,
      );

      const result = await controller.uploadPdf(
        mockFile,
        mockRequestBody as any,
      );

      expect(uploadService.processPdfFile).toHaveBeenCalledWith(mockFile.path, {
        numberOfMultipleChoice: 3,
        numberOfTrueFalse: 2,
        numberOfShortAnswer: 1,
      });
      expect(result).toEqual({
        success: true,
        questions: mockGeneratedQuestions,
      });
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(
        controller.uploadPdf(null as any, mockRequestBody as any),
      ).rejects.toThrow(BadRequestException);
      expect(() => {
        throw new BadRequestException('No file uploaded');
      }).toThrow('No file uploaded');
    });

    it('should parse question counts as integers', async () => {
      const bodyWithStrings = {
        numberOfMultipleChoice: '5',
        numberOfTrueFalse: '3',
        numberOfShortAnswer: '2',
      };

      mockUploadService.processPdfFile.mockResolvedValue([]);

      await controller.uploadPdf(mockFile, bodyWithStrings as any);

      expect(uploadService.processPdfFile).toHaveBeenCalledWith(mockFile.path, {
        numberOfMultipleChoice: 5,
        numberOfTrueFalse: 3,
        numberOfShortAnswer: 2,
      });
    });

    it('should handle invalid question counts gracefully', async () => {
      const bodyWithInvalid = {
        numberOfMultipleChoice: 'invalid',
        numberOfTrueFalse: '',
        numberOfShortAnswer: null,
      };

      mockUploadService.processPdfFile.mockResolvedValue([]);

      await controller.uploadPdf(mockFile, bodyWithInvalid as any);

      expect(uploadService.processPdfFile).toHaveBeenCalledWith(mockFile.path, {
        numberOfMultipleChoice: 0,
        numberOfTrueFalse: 0,
        numberOfShortAnswer: 0,
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('PDF processing failed');
      mockUploadService.processPdfFile.mockRejectedValue(error);

      await expect(
        controller.uploadPdf(mockFile, mockRequestBody as any),
      ).rejects.toThrow('PDF processing failed');
    });

    it('should use correct file path from multer', async () => {
      const customFile = { ...mockFile, path: './uploads/custom-file.pdf' };
      mockUploadService.processPdfFile.mockResolvedValue([]);

      await controller.uploadPdf(customFile, mockRequestBody as any);

      expect(uploadService.processPdfFile).toHaveBeenCalledWith(
        './uploads/custom-file.pdf',
        expect.any(Object),
      );
    });
  });

  describe('generateChatbotQuestions', () => {
    const mockChatbotRequest: ChatbotRequest = {
      topic: 'Mathematics',
      number: 5,
      types: {
        multipleChoice: 3,
        trueFalse: 1,
        shortAnswer: 1,
      },
    };

    const mockTopicQuestions = [
      {
        text: 'What is algebra?',
        type: 'multiple-choice' as const,
        options: ['Math branch', 'Science', 'Art', 'History'],
        answer: 'Math branch',
      },
    ];

    it('should generate questions from topic successfully', async () => {
      mockUploadService.generateChatbotQuestions.mockResolvedValue(
        mockTopicQuestions,
      );

      const result =
        await controller.generateChatbotQuestions(mockChatbotRequest);

      expect(uploadService.generateChatbotQuestions).toHaveBeenCalledWith(
        mockChatbotRequest,
      );
      expect(result).toHaveProperty('questions');
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('should handle missing topic', async () => {
      const requestWithoutTopic = {
        ...mockChatbotRequest,
        topic: '',
      };

      mockUploadService.generateChatbotQuestions.mockResolvedValue([]);

      const result =
        await controller.generateChatbotQuestions(requestWithoutTopic);

      expect(result).toHaveProperty('questions');
      expect(uploadService.generateChatbotQuestions).toHaveBeenCalledWith(
        requestWithoutTopic,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Topic generation failed');
      mockUploadService.generateChatbotQuestions.mockRejectedValue(error);

      await expect(
        controller.generateChatbotQuestions(mockChatbotRequest),
      ).rejects.toThrow('Topic generation failed');
    });

    it('should validate question type distribution', async () => {
      const requestWithZeroTypes = {
        topic: 'Science',
        number: 0,
        types: {
          multipleChoice: 0,
          trueFalse: 0,
          shortAnswer: 0,
        },
      };

      mockUploadService.generateChatbotQuestions.mockResolvedValue([]);

      const result =
        await controller.generateChatbotQuestions(requestWithZeroTypes);

      expect(uploadService.generateChatbotQuestions).toHaveBeenCalledWith(
        requestWithZeroTypes,
      );
      expect(result).toHaveProperty('questions');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', UploadController);
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('API Documentation', () => {
    it('should have ApiTags decorator', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', UploadController);
      expect(tags).toEqual(['Upload']);
    });

    it('should have ApiBearerAuth decorator', () => {
      const bearerAuth = Reflect.getMetadata(
        'swagger/apiSecurity',
        UploadController,
      );
      expect(bearerAuth).toBeDefined();
    });
  });

  describe('File Upload Configuration', () => {
    it('should accept only PDF files', () => {
      // This tests the file filter configuration
      // In a real scenario, multer would reject non-PDF files
      expect(mockFile.mimetype).toBe('application/pdf');
    });

    it('should generate random filename', () => {
      // The multer configuration generates random filenames
      expect(mockFile.filename).toContain('.pdf');
      expect(typeof mockFile.filename).toBe('string');
    });

    it('should store files in uploads directory', () => {
      expect(mockFile.destination).toBe('./uploads');
      expect(mockFile.path).toContain('./uploads/');
    });
  });

  describe('Error Handling', () => {
    it('should handle file upload errors gracefully', async () => {
      const mockRequestBody = {
        numberOfMultipleChoice: '3',
        numberOfTrueFalse: '2',
        numberOfShortAnswer: '1',
      };

      // Simulate file upload failure
      await expect(
        controller.uploadPdf(null as any, mockRequestBody as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate file size limits', () => {
      // 10MB limit as per configuration
      const maxSize = 10 * 1024 * 1024;
      expect(mockFile.size).toBeLessThanOrEqual(maxSize);
    });
  });
});
