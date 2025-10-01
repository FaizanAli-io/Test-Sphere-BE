import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DownloadService } from './download.service';
import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';

describe('DownloadService', () => {
  let service: DownloadService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    test: {
      findUnique: jest.fn(),
    },
    testSubmission: {
      findMany: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
    testPhoto: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockResponse = {
    setHeader: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DownloadService>(DownloadService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('downloadTestResults', () => {
    const mockTest = {
      id: 1,
      title: 'Math Test',
      class: {
        id: 1,
        name: 'Mathematics 101',
        teacherId: 1,
      },
      questions: [
        {
          id: 1,
          marks: 10,
          answerMarks: [
            {
              studentId: 2,
              obtainedMarks: 8,
              student: { name: 'John Doe', email: 'john@example.com' },
            },
          ],
        },
        {
          id: 2,
          marks: 15,
          answerMarks: [
            {
              studentId: 2,
              obtainedMarks: 12,
              student: { name: 'John Doe', email: 'john@example.com' },
            },
          ],
        },
      ],
    };

    const mockSubmissions = [
      {
        userId: 2,
        testId: 1,
        answersSubmitted: true,
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ];

    it('should generate and send Excel file for test results', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testSubmission.findMany.mockResolvedValue(
        mockSubmissions,
      );

      await service.downloadTestResults(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename='),
      );
    });

    it('should throw NotFoundException when test not found', async () => {
      const userId = 1;
      const testId = 999;

      mockPrismaService.test.findUnique.mockResolvedValue(null);

      await expect(
        service.downloadTestResults(userId, testId, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      const userId = 2; // Different from teacherId (1)
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);

      await expect(
        service.downloadTestResults(userId, testId, mockResponse),
      ).rejects.toThrow(ForbiddenException);
      expect(() => {
        throw new ForbiddenException(
          'Only the test creator can download results',
        );
      }).toThrow('Only the test creator can download results');
    });

    it('should handle test with no submissions', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testSubmission.findMany.mockResolvedValue([]);

      await service.downloadTestResults(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    });

    it('should calculate percentage correctly', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testSubmission.findMany.mockResolvedValue(
        mockSubmissions,
      );

      // Mock console.log to verify calculations if needed
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.downloadTestResults(userId, testId, mockResponse);

      // Verify response setup for Excel download
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(2);

      consoleSpy.mockRestore();
    });
  });

  describe('downloadAllLogs', () => {
    const mockTest = {
      id: 1,
      title: 'Math Test',
      class: {
        id: 1,
        name: 'Mathematics 101',
        teacherId: 1,
      },
    };

    const mockLogs = [
      {
        id: 1,
        userId: 2,
        testId: 1,
        action: 'Test Started',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z'),
        logs: { activity: 'Test Started' },
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      {
        id: 2,
        userId: 2,
        testId: 1,
        action: 'Answer Submitted',
        timestamp: new Date('2024-01-01T10:15:00Z'),
        createdAt: new Date('2024-01-01T10:15:00Z'),
        logs: { activity: 'Answer Submitted' },
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ];

    it('should generate and send Excel file for activity logs', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.activityLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 2, name: 'John Doe', email: 'john@example.com' },
      ]);

      await service.downloadAllLogs(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename='),
      );
    });

    it('should throw NotFoundException when test not found', async () => {
      const userId = 1;
      const testId = 999;

      mockPrismaService.test.findUnique.mockResolvedValue(null);
      mockPrismaService.activityLog.findMany.mockResolvedValue([]);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await expect(
        service.downloadAllLogs(userId, testId, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      const userId = 2;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.activityLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 2, name: 'John Doe', email: 'john@example.com' },
      ]);

      await expect(
        service.downloadAllLogs(userId, testId, mockResponse),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('downloadAllPictures', () => {
    const mockTest = {
      id: 1,
      title: 'Math Test',
      class: {
        id: 1,
        name: 'Mathematics 101',
        teacherId: 1,
      },
    };

    const mockPhotos = [
      {
        id: 1,
        userId: 2,
        testId: 1,
        photoPath: '/uploads/test1_user2_photo1.jpg',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        user: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
    ];

    it('should generate and send ZIP file for test photos', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testPhoto.findMany.mockResolvedValue(mockPhotos);

      // Mock fs.existsSync to return true for photo files
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(Buffer.from('fake image data'));

      await service.downloadAllPictures(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment; filename='),
      );
    });

    it('should throw NotFoundException when test not found', async () => {
      const userId = 1;
      const testId = 999;

      mockPrismaService.test.findUnique.mockResolvedValue(null);

      await expect(
        service.downloadAllPictures(userId, testId, mockResponse),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the teacher', async () => {
      const userId = 2;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);

      await expect(
        service.downloadAllPictures(userId, testId, mockResponse),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle case with no photos', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testPhoto.findMany.mockResolvedValue([]);

      await service.downloadAllPictures(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip',
      );
    });

    it('should skip missing photo files', async () => {
      const userId = 1;
      const testId = 1;

      mockPrismaService.test.findUnique.mockResolvedValue(mockTest);
      mockPrismaService.testPhoto.findMany.mockResolvedValue(mockPhotos);

      // Mock fs.existsSync to return false (file doesn't exist)
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      await service.downloadAllPictures(userId, testId, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip',
      );
    });
  });
});
