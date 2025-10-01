import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return HTML welcome page', () => {
      const result = service.getHello();

      expect(result).toContain('Test Sphere Backend');
      expect(result).toContain('Development Team');
      expect(result).toContain('API Documentation');
      expect(result).toContain('<!DOCTYPE html>');
      expect(typeof result).toBe('string');
    });

    it('should return HTML formatted message', () => {
      const result = service.getHello();

      expect(result).toContain('<h1>');
      expect(result).toContain('</h1>');
      expect(result).toContain('<p>');
      expect(result).toContain('</p>');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ test: 1 }]);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'OK',
        message: 'API is healthy!',
      });
      expect(mockPrismaService.$queryRaw).toHaveBeenCalledWith(
        expect.anything(),
      );
    });

    it('should return error status when database is not accessible', async () => {
      const dbError = new Error('Connection failed');
      mockPrismaService.$queryRaw.mockRejectedValue(dbError);

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'ERROR',
        message: 'API is not healthy.',
      });
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockPrismaService.$queryRaw.mockRejectedValue(timeoutError);

      const result = await service.healthCheck();

      expect(result.status).toBe('ERROR');
      expect(result.message).toBe('API is not healthy.');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      mockPrismaService.$queryRaw.mockRejectedValue(networkError);

      const result = await service.healthCheck();

      expect(result.status).toBe('ERROR');
      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
    });
  });
});
