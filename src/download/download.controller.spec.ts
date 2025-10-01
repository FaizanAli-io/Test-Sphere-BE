import { Test, TestingModule } from '@nestjs/testing';
import { DownloadController } from './download.controller';
import { DownloadService } from './download.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';

describe('DownloadController', () => {
  let controller: DownloadController;
  let downloadService: DownloadService;

  const mockDownloadService = {
    downloadTestResults: jest.fn(),
    downloadAllLogs: jest.fn(),
    downloadAllPictures: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DownloadController],
      providers: [
        {
          provide: DownloadService,
          useValue: mockDownloadService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DownloadController>(DownloadController);
    downloadService = module.get<DownloadService>(DownloadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('downloadTestResults', () => {
    it('should call downloadService.downloadTestResults with correct parameters', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadTestResults.mockResolvedValue(undefined);

      await controller.downloadTestResults(userId, testId, mockResponse);

      expect(downloadService.downloadTestResults).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
      expect(downloadService.downloadTestResults).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      const testId = 100;
      const error = new Error('Service error');

      mockDownloadService.downloadTestResults.mockRejectedValue(error);

      await expect(
        controller.downloadTestResults(userId, testId, mockResponse),
      ).rejects.toThrow('Service error');
    });

    it('should parse testId as integer', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadTestResults.mockResolvedValue(undefined);

      await controller.downloadTestResults(userId, testId, mockResponse);

      expect(typeof testId).toBe('number');
      expect(downloadService.downloadTestResults).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
    });
  });

  describe('downloadAllLogs', () => {
    it('should call downloadService.downloadAllLogs with correct parameters', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadAllLogs.mockResolvedValue(undefined);

      await controller.downloadAllLogs(userId, testId, mockResponse);

      expect(downloadService.downloadAllLogs).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
      expect(downloadService.downloadAllLogs).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      const testId = 100;
      const error = new Error('Logs download failed');

      mockDownloadService.downloadAllLogs.mockRejectedValue(error);

      await expect(
        controller.downloadAllLogs(userId, testId, mockResponse),
      ).rejects.toThrow('Logs download failed');
    });

    it('should parse testId as integer', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadAllLogs.mockResolvedValue(undefined);

      await controller.downloadAllLogs(userId, testId, mockResponse);

      expect(typeof testId).toBe('number');
      expect(downloadService.downloadAllLogs).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
    });
  });

  describe('downloadAllPictures', () => {
    it('should call downloadService.downloadAllPictures with correct parameters', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadAllPictures.mockResolvedValue(undefined);

      await controller.downloadAllPictures(userId, testId, mockResponse);

      expect(downloadService.downloadAllPictures).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
      expect(downloadService.downloadAllPictures).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      const testId = 100;
      const error = new Error('Pictures download failed');

      mockDownloadService.downloadAllPictures.mockRejectedValue(error);

      await expect(
        controller.downloadAllPictures(userId, testId, mockResponse),
      ).rejects.toThrow('Pictures download failed');
    });

    it('should parse testId as integer', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadAllPictures.mockResolvedValue(undefined);

      await controller.downloadAllPictures(userId, testId, mockResponse);

      expect(typeof testId).toBe('number');
      expect(downloadService.downloadAllPictures).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should be protected by JwtAuthGuard', () => {
      const guards = Reflect.getMetadata('__guards__', DownloadController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should extract user ID from JWT token', async () => {
      const userId = 1;
      const testId = 100;

      mockDownloadService.downloadTestResults.mockResolvedValue(undefined);

      await controller.downloadTestResults(userId, testId, mockResponse);

      expect(downloadService.downloadTestResults).toHaveBeenCalledWith(
        userId,
        testId,
        mockResponse,
      );
    });
  });

  describe('API Documentation', () => {
    it('should have ApiTags decorator', () => {
      const tags = Reflect.getMetadata(
        'swagger/apiUseTags',
        DownloadController,
      );
      expect(tags).toEqual(['Download']);
    });

    it('should have ApiBearerAuth decorator', () => {
      const bearerAuth = Reflect.getMetadata(
        'swagger/apiSecurity',
        DownloadController,
      );
      expect(bearerAuth).toBeDefined();
    });
  });
});
