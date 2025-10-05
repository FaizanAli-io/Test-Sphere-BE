jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let emailService: EmailService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendOtpEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    const dto = {
      name: 'John',
      email: 'john@example.com',
      password: 'password',
      role: UserRole.STUDENT,
      uniqueIdentifier: 'ABC123',
    };

    it('should throw if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.signup(dto)).rejects.toThrow(ConflictException);
    });

    it('should create user and send OTP', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 1, email: dto.email });
      await service.signup(dto);
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    const dto = { email: 'john@example.com', otp: '123456' };

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyOtp(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if OTP missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, otp: null });
      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if OTP mismatch', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        otp: '999999',
        otpExpiry: new Date(Date.now() + 5000),
      });
      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
    });

    it('should handle expired OTP by resending a new one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        otp: '123456',
        otpExpiry: new Date(Date.now() - 1000),
      });

      const result = await service.verifyOtp(dto);

      expect(result).toEqual({
        message: 'OTP expired. A new OTP has been sent to your email.',
        otpResent: true,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            otp: expect.any(String),
            otpExpiry: expect.any(Date),
          }),
        }),
      );
    });

    it('should verify successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        otp: '123456',
        otpExpiry: new Date(Date.now() + 60000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.verifyOtp(dto);
      expect(result.message).toContain('Account verified');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'john@example.com', password: 'password' };

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if not verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        verified: false,
      });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    const mockCompare = jest.spyOn(
      bcrypt,
      'compare',
    ) as unknown as jest.MockedFunction<
      (data: string, encrypted: string) => Promise<boolean>
    >;

    it('should throw if password invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        verified: true,
        password: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if valid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: dto.email,
        verified: true,
        password: 'hashed',
        role: UserRole.STUDENT,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');
      const result = await service.login(dto);
      expect(result.accessToken).toBe('jwt-token');
    });
  });

  describe('forgotPassword', () => {
    const dto = { email: 'john@example.com' };

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.forgotPassword(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should send OTP if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: dto.email });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.forgotPassword(dto);
      expect(result.message).toContain('OTP sent');
      expect(emailService.sendOtpEmail).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const dto = {
      email: 'john@example.com',
      otp: '123456',
      newPassword: 'newPass123',
    };

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if OTP mismatch', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ otp: '999999' });
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if OTP expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        otp: '123456',
        otpExpiry: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reset password successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        otp: '123456',
        otpExpiry: new Date(Date.now() + 5000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      const result = await service.resetPassword(dto);
      expect(result.message).toContain('Password reset successful');
    });
  });
});
