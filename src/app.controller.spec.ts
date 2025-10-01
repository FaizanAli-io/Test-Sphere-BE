import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockAppService = {
    getHello: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHello', () => {
    it('should return a welcome message', () => {
      const expectedMessage = 'Welcome to Test Sphere API!';
      mockAppService.getHello.mockReturnValue(expectedMessage);

      const result = controller.getHello();

      expect(result).toBe(expectedMessage);
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is accessible', async () => {
      const expectedHealth = {
        status: 'OK',
        message: 'API is healthy!',
        timestamp: expect.any(String),
        database: 'connected',
      };

      mockAppService.healthCheck.mockResolvedValue(expectedHealth);

      const result = await controller.healthCheck();

      expect(result).toEqual(expectedHealth);
      expect(mockAppService.healthCheck).toHaveBeenCalled();
    });

    it('should return unhealthy status when database is not accessible', async () => {
      const expectedHealth = {
        status: 'ERROR',
        message: 'Database connection failed',
        timestamp: expect.any(String),
        database: 'disconnected',
      };

      mockAppService.healthCheck.mockResolvedValue(expectedHealth);

      const result = await controller.healthCheck();

      expect(result).toEqual(expectedHealth);
      expect(mockAppService.healthCheck).toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Service unavailable');
      mockAppService.healthCheck.mockRejectedValue(error);

      await expect(controller.healthCheck()).rejects.toThrow(
        'Service unavailable',
      );
      expect(mockAppService.healthCheck).toHaveBeenCalled();
    });
  });
});
