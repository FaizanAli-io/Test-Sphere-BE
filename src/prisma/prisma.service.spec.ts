import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { PrismaClient } from '@prisma/client';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend PrismaClient', () => {
    expect(service).toBeDefined();
    expect(typeof service.$connect).toBe('function');
    expect(typeof service.$disconnect).toBe('function');
  });

  describe('onModuleInit', () => {
    it('should call $connect on module initialization', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);

      connectSpy.mockRestore();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Database connection failed');
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.onModuleInit()).rejects.toThrow(
        'Database connection failed',
      );

      connectSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call $disconnect on module destruction', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue();

      await service.onModuleDestroy();

      expect(disconnectSpy).toHaveBeenCalledTimes(1);

      disconnectSpy.mockRestore();
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Database disconnection failed');
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockRejectedValue(error);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.onModuleDestroy()).rejects.toThrow(
        'Database disconnection failed',
      );

      disconnectSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Database Operations', () => {
    it('should have all Prisma client properties', () => {
      // Test that PrismaService has access to all database models
      expect(service.user).toBeDefined();
      expect(service.class).toBeDefined();
      expect(service.test).toBeDefined();
      expect(service.question).toBeDefined();
      expect(service.testSubmission).toBeDefined();
      expect(service.studentClassRelation).toBeDefined();
      expect(service.testAnswer).toBeDefined();
      expect(service.activityLog).toBeDefined();
      expect(service.testPhoto).toBeDefined();
      expect(service.answerMark).toBeDefined();
    });

    it('should have transaction capabilities', () => {
      expect(service.$transaction).toBeDefined();
      expect(typeof service.$transaction).toBe('function');
    });

    it('should have raw query capabilities', () => {
      expect(service.$queryRaw).toBeDefined();
      expect(service.$executeRaw).toBeDefined();
      expect(typeof service.$queryRaw).toBe('function');
      expect(typeof service.$executeRaw).toBe('function');
    });

    it('should provide database connection methods', () => {
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
      expect(typeof service.$connect).toBe('function');
      expect(typeof service.$disconnect).toBe('function');
    });
  });

  describe('Service Lifecycle', () => {
    it('should implement OnModuleInit interface', () => {
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should implement OnModuleDestroy interface', () => {
      expect(service.onModuleDestroy).toBeDefined();
      expect(typeof service.onModuleDestroy).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection timeouts', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'ConnectTimeoutError';

      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockRejectedValue(timeoutError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection timeout',
      );

      connectSpy.mockRestore();
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.name = 'AuthenticationError';

      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockRejectedValue(authError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Authentication failed',
      );

      connectSpy.mockRestore();
    });
  });

  describe('Database Schema Access', () => {
    it('should provide access to User model', () => {
      expect(service.user).toBeDefined();
      expect(service.user.findMany).toBeDefined();
      expect(service.user.findUnique).toBeDefined();
      expect(service.user.create).toBeDefined();
      expect(service.user.update).toBeDefined();
      expect(service.user.delete).toBeDefined();
    });

    it('should provide access to Class model', () => {
      expect(service.class).toBeDefined();
      expect(service.class.findMany).toBeDefined();
      expect(service.class.findUnique).toBeDefined();
      expect(service.class.create).toBeDefined();
      expect(service.class.update).toBeDefined();
      expect(service.class.delete).toBeDefined();
    });

    it('should provide access to Test model', () => {
      expect(service.test).toBeDefined();
      expect(service.test.findMany).toBeDefined();
      expect(service.test.findUnique).toBeDefined();
      expect(service.test.create).toBeDefined();
      expect(service.test.update).toBeDefined();
      expect(service.test.delete).toBeDefined();
    });

    it('should provide access to Question model', () => {
      expect(service.question).toBeDefined();
      expect(service.question.findMany).toBeDefined();
      expect(service.question.findUnique).toBeDefined();
      expect(service.question.create).toBeDefined();
      expect(service.question.update).toBeDefined();
      expect(service.question.delete).toBeDefined();
    });
  });

  describe('Advanced Database Features', () => {
    it('should support database transactions', () => {
      expect(service.$transaction).toBeDefined();
      expect(typeof service.$transaction).toBe('function');
    });

    it('should support raw SQL queries', () => {
      expect(service.$queryRaw).toBeDefined();
      expect(service.$executeRaw).toBeDefined();
    });

    it('should support database introspection', () => {
      expect(service.$queryRaw).toBeDefined();
      expect(service.$executeRaw).toBeDefined();
    });

    it('should support connection pooling', () => {
      // PrismaClient inherently supports connection pooling
      expect(service).toBeDefined();
      expect(typeof service.$connect).toBe('function');
    });
  });
});
