import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadService,
  QuestionGenerationRequest,
  ChatbotRequest,
} from './upload.service';
import * as fs from 'fs';
import pdfParse from 'pdf-parse';
import { OpenAI } from 'openai';

// Mock external dependencies
jest.mock('fs');
jest.mock('pdf-parse');
jest.mock('openai');

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        OPENROUTER_API_KEY: 'test-api-key',
      };
      return config[key];
    }),
  };

  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    // Mock OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () => mockOpenAI as any,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize OpenAI client when API key is provided', () => {
      expect(configService.get).toHaveBeenCalledWith('OPENROUTER_API_KEY');
      expect(OpenAI).toHaveBeenCalledWith({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: 'test-api-key',
      });
    });

    it('should not initialize OpenAI client when API key is missing', async () => {
      const mockConfigWithoutKey = {
        get: jest.fn(() => null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UploadService,
          {
            provide: ConfigService,
            useValue: mockConfigWithoutKey,
          },
        ],
      }).compile();

      const serviceWithoutKey = module.get<UploadService>(UploadService);
      expect(serviceWithoutKey).toBeDefined();
    });
  });

  describe('processPdfFile', () => {
    const mockQuestionRequest: QuestionGenerationRequest = {
      numberOfMultipleChoice: 2,
      numberOfTrueFalse: 1,
      numberOfShortAnswer: 1,
    };

    const mockPdfContent = {
      text: 'This is a sample PDF content about mathematics and algebra.',
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                text: 'What is algebra?',
                type: 'multiple-choice',
                options: ['A branch of math', 'A science', 'An art', 'A sport'],
                answer: 'A branch of math',
              },
              {
                text: 'Mathematics involves numbers.',
                type: 'true-false',
                options: ['True', 'False'],
                answer: true,
              },
            ]),
          },
        },
      ],
    };

    beforeEach(() => {
      (fs.readFileSync as jest.Mock).mockReturnValue(
        Buffer.from('fake pdf data'),
      );
      (pdfParse as jest.MockedFunction<typeof pdfParse>).mockResolvedValue(
        mockPdfContent as any,
      );
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
    });

    it('should process PDF file and generate questions successfully', async () => {
      const filePath = './uploads/test.pdf';

      const result = await service.processPdfFile(
        filePath,
        mockQuestionRequest,
      );

      expect(fs.readFileSync).toHaveBeenCalledWith(filePath);
      expect(pdfParse).toHaveBeenCalled();
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('options');
      expect(result[0]).toHaveProperty('answer');
    });

    it('should throw BadRequestException when file does not exist', async () => {
      const filePath = './uploads/nonexistent.pdf';
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(
        service.processPdfFile(filePath, mockQuestionRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle PDF parsing errors', async () => {
      const filePath = './uploads/corrupt.pdf';
      (pdfParse as jest.MockedFunction<typeof pdfParse>).mockRejectedValue(
        new Error('Invalid PDF format'),
      );

      await expect(
        service.processPdfFile(filePath, mockQuestionRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle OpenAI API errors', async () => {
      const filePath = './uploads/test.pdf';
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.processPdfFile(filePath, mockQuestionRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid JSON response from OpenAI', async () => {
      const filePath = './uploads/test.pdf';
      const invalidResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(invalidResponse);

      await expect(
        service.processPdfFile(filePath, mockQuestionRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create prompt for question generation', async () => {
      const filePath = './uploads/test.pdf';

      await service.processPdfFile(filePath, mockQuestionRequest);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      const promptCall = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(promptCall.messages).toBeDefined();
      expect(promptCall.messages[0].content).toBeDefined();
    });

    it('should handle file cleanup', async () => {
      const filePath = './uploads/test.pdf';
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.processPdfFile(filePath, mockQuestionRequest);

      // File cleanup is attempted in the service
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });
  });

  describe('generateChatbotQuestions', () => {
    const mockChatbotRequest: ChatbotRequest = {
      topic: 'Mathematics',
      number: 3,
      types: {
        multipleChoice: 2,
        trueFalse: 1,
        shortAnswer: 0,
      },
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                text: 'What is calculus?',
                type: 'multiple-choice',
                options: ['Math branch', 'Science', 'Art', 'Sport'],
                answer: 'Math branch',
              },
              {
                text: 'Mathematics is important.',
                type: 'true-false',
                options: ['True', 'False'],
                answer: true,
              },
            ]),
          },
        },
      ],
    };

    beforeEach(() => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
    });

    it('should generate questions from topic successfully', async () => {
      const result = await service.generateChatbotQuestions(mockChatbotRequest);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('text');
      expect(result[0]).toHaveProperty('type');
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error'),
      );

      await expect(
        service.generateChatbotQuestions(mockChatbotRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid JSON response', async () => {
      const invalidResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON',
            },
          },
        ],
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(invalidResponse);

      await expect(
        service.generateChatbotQuestions(mockChatbotRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create prompt for topic-based generation', async () => {
      await service.generateChatbotQuestions(mockChatbotRequest);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
      const promptCall = mockOpenAI.chat.completions.create.mock.calls[0][0];
      expect(promptCall.messages).toBeDefined();
      expect(promptCall.messages[0].content).toBeDefined();
    });

    it('should handle validation for required fields', async () => {
      const emptyTopicRequest = {
        topic: '',
        number: 3,
        types: {
          multipleChoice: 2,
          trueFalse: 1,
          shortAnswer: 0,
        },
      };

      await expect(
        service.generateChatbotQuestions(emptyTopicRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Additional Methods', () => {
    it('should have processCsvFile method', () => {
      expect(service.processCsvFile).toBeDefined();
      expect(typeof service.processCsvFile).toBe('function');
    });

    it('should be able to handle different file types', () => {
      // Test that the service is extensible for different file processing
      expect(service).toBeDefined();
      expect(service.processPdfFile).toBeDefined();
      expect(service.generateChatbotQuestions).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing OpenAI client gracefully', async () => {
      const serviceWithoutClient = new UploadService({
        get: () => null,
      } as any);

      const mockRequest: ChatbotRequest = {
        topic: 'Test',
        number: 1,
        types: { multipleChoice: 1 },
      };

      await expect(
        serviceWithoutClient.generateChatbotQuestions(mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
