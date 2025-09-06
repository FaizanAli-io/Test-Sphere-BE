import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true),
  }),
}));

describe('OtpService', () => {
  let service: OtpService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'password123',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit OTP', async () => {
      const otp = await service.generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    });
  });

  describe('saveOtp', () => {
    it('should save OTP to database with expiry', async () => {
      const email = 'test@example.com';
      const otp = '123456';

      await service.saveOtp(email, otp);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { email },
        data: expect.objectContaining({
          otp,
          otpExpiry: expect.any(Date),
          otpAttempts: 0,
        }),
      });
    });
  });

  describe('sendOtpEmail', () => {
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue(true),
    };

    beforeEach(() => {
      (nodemailer.createTransport as jest.Mock).mockReturnValue(
        mockTransporter,
      );
    });

    it('should send OTP via email', async () => {
      const email = 'test@example.com';
      const otp = '123456';

      await service.sendOtpEmail(email, otp);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: true,
        auth: {
          user: 'test@example.com',
          pass: 'password123',
        },
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: email,
        subject: 'Account Verification OTP',
        text: `Your OTP for account verification is: ${otp}. This OTP is valid for 10 minutes.`,
      });
    });

    it('should throw an error if email sending fails', async () => {
      const email = 'test@example.com';
      const otp = '123456';

      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Failed to send'),
      );

      await expect(service.sendOtpEmail(email, otp)).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    const email = 'test@example.com';
    const validOtp = '123456';

    it('should return true for valid OTP', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        otp: validOtp,
        otpExpiry: new Date(Date.now() + 60000),
        otpAttempts: 0,
        otpLastAttempt: null,
      });

      const result = await service.verifyOtp(email, validOtp);
      expect(result).toBe(true);
    });

    it('should return false for expired OTP', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        otp: validOtp,
        otpExpiry: new Date(Date.now() - 60000),
        otpAttempts: 0,
        otpLastAttempt: null,
      });

      const result = await service.verifyOtp(email, validOtp);
      expect(result).toBe(false);
    });

    it('should return false after too many attempts', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        otp: validOtp,
        otpExpiry: new Date(Date.now() + 60000),
        otpAttempts: 3,
        otpLastAttempt: new Date(),
      });

      const result = await service.verifyOtp(email, validOtp);
      expect(result).toBe(false);
    });
  });
});
