import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));
import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      role: UserRole.student,
      uniqueIdentifier: 'test-123',
    };

    beforeEach(() => {
      // Default mock implementations
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue('jwt_token');
      // Reset bcrypt mocks to their default values
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should create a new user successfully', async () => {
      const hashedPassword = 'hashedPassword';
      const mockUser = {
        id: 1,
        ...signupDto,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...signupDto,
          password: hashedPassword,
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        email: signupDto.email,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if uniqueIdentifier already exists', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 1,
        uniqueIdentifier: signupDto.uniqueIdentifier,
      });

      await expect(service.signup(signupDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 1,
      email: loginDto.email,
      password: 'hashedPassword',
      role: UserRole.student,
      name: 'Test User',
    };

    beforeEach(() => {
      mockJwtService.sign.mockReturnValue('jwt_token');
      // Reset bcrypt mocks to their default values
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    });

    it('should return token and user data on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
