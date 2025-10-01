import { Test, TestingModule } from '@nestjs/testing';
import { OtpService } from './otp.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('OtpService', () => {
  let service: OtpService;
  let emailService: EmailService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendOtpEmail: jest.fn().mockResolvedValue(undefined),
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
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    emailService = module.get<EmailService>(EmailService);
    prismaService = module.get<PrismaService>(PrismaService);

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
    it('should send OTP via email', async () => {
      const email = 'test@example.com';
      const otp = '123456';

      await service.sendOtpEmail(email, otp);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(email, otp);
    });

    it('should throw an error if email sending fails', async () => {
      const email = 'test@example.com';
      const otp = '123456';

      mockEmailService.sendOtpEmail.mockRejectedValueOnce(
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
