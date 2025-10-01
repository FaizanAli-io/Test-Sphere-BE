import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');
const mockNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockTransporter = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'password123',
        FRONTEND_URL: 'https://testsphere.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Reset the mock before each test
    mockNodemailer.createTransport.mockReturnValue(mockTransporter as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should create nodemailer transporter with correct configuration', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: true,
        auth: {
          user: 'test@example.com',
          pass: 'password123',
        },
      });
    });
  });

  describe('sendOtpEmail', () => {
    it('should send OTP email with correct parameters', async () => {
      const email = 'user@example.com';
      const otp = '123456';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendOtpEmail(email, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: email,
        subject: 'Account Verification OTP',
        html: expect.stringContaining(otp),
        text: expect.stringContaining(otp),
      });
    });

    it('should include OTP in both HTML and text content', async () => {
      const email = 'user@example.com';
      const otp = '654321';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendOtpEmail(email, otp);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(otp);
      expect(callArgs.text).toContain(otp);
      expect(callArgs.html).toContain('Account Verification');
      expect(callArgs.text).toContain('This OTP is valid for 10 minutes');
    });

    it('should handle email sending errors', async () => {
      const email = 'user@example.com';
      const otp = '123456';
      const error = new Error('SMTP Error');

      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendOtpEmail(email, otp)).rejects.toThrow(
        'SMTP Error',
      );
    });

    it('should format HTML email correctly', async () => {
      const email = 'user@example.com';
      const otp = '789012';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendOtpEmail(email, otp);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('font-family: Arial, sans-serif');
      expect(callArgs.html).toContain('background-color: #f4f4f4');
      expect(callArgs.html).toContain('This OTP is valid for 10 minutes');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      const email = 'user@example.com';
      const name = 'John Doe';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail(email, name);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: email,
        subject: 'Welcome to Test Sphere',
        html: expect.stringContaining(name),
        text: expect.stringContaining(name),
      });
    });

    it('should personalize email with user name', async () => {
      const email = 'user@example.com';
      const name = 'Jane Smith';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail(email, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`Hi ${name}`);
      expect(callArgs.text).toContain(`Hi ${name}`);
      expect(callArgs.html).toContain('Welcome to Test Sphere!');
    });

    it('should handle email sending errors', async () => {
      const email = 'user@example.com';
      const name = 'John Doe';
      const error = new Error('Network Error');

      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(service.sendWelcomeEmail(email, name)).rejects.toThrow(
        'Network Error',
      );
    });

    it('should include welcome message content', async () => {
      const email = 'user@example.com';
      const name = 'Test User';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail(email, name);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('account has been successfully verified');
      expect(callArgs.html).toContain('You can now log in');
      expect(callArgs.html).toContain('The Test Sphere Team');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct parameters', async () => {
      const email = 'user@example.com';
      const resetToken = 'reset-token-123';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'test@example.com',
        to: email,
        subject: 'Password Reset Request',
        html: expect.stringContaining(resetToken),
        text: expect.stringContaining(resetToken),
      });
    });

    it('should include reset URL with token', async () => {
      const email = 'user@example.com';
      const resetToken = 'abc123xyz';
      const expectedUrl = `https://testsphere.com/reset-password?token=${resetToken}`;

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(expectedUrl);
      expect(callArgs.text).toContain(expectedUrl);
    });

    it('should handle email sending errors', async () => {
      const email = 'user@example.com';
      const resetToken = 'reset-token-123';
      const error = new Error('Authentication failed');

      mockTransporter.sendMail.mockRejectedValue(error);

      await expect(
        service.sendPasswordResetEmail(email, resetToken),
      ).rejects.toThrow('Authentication failed');
    });

    it('should include security warnings', async () => {
      const email = 'user@example.com';
      const resetToken = 'secure-token-456';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('This link will expire in 1 hour');
      expect(callArgs.html).toContain(
        "If you didn't request this password reset",
      );
      expect(callArgs.text).toContain('This link will expire in 1 hour');
    });

    it('should format reset button correctly', async () => {
      const email = 'user@example.com';
      const resetToken = 'button-token-789';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('background-color: #007bff');
      expect(callArgs.html).toContain('Reset Password');
      expect(callArgs.html).toContain('text-decoration: none');
    });
  });

  describe('Configuration Integration', () => {
    it('should use config service for email settings', () => {
      expect(configService.get).toHaveBeenCalledWith('EMAIL_HOST');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_PORT');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_USER');
      expect(configService.get).toHaveBeenCalledWith('EMAIL_PASSWORD');
    });

    it('should use config service for frontend URL', async () => {
      const email = 'user@example.com';
      const resetToken = 'config-token';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordResetEmail(email, resetToken);

      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
    });
  });

  describe('Email Content Validation', () => {
    it('should always include both HTML and text versions', async () => {
      const email = 'user@example.com';

      // Test OTP email
      await service.sendOtpEmail(email, '123456');
      let callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs).toHaveProperty('html');
      expect(callArgs).toHaveProperty('text');

      // Test welcome email
      await service.sendWelcomeEmail(email, 'Test User');
      callArgs = mockTransporter.sendMail.mock.calls[1][0];
      expect(callArgs).toHaveProperty('html');
      expect(callArgs).toHaveProperty('text');

      // Test password reset email
      await service.sendPasswordResetEmail(email, 'token123');
      callArgs = mockTransporter.sendMail.mock.calls[2][0];
      expect(callArgs).toHaveProperty('html');
      expect(callArgs).toHaveProperty('text');
    });

    it('should use consistent sender address', async () => {
      const email = 'user@example.com';

      await service.sendOtpEmail(email, '123456');
      await service.sendWelcomeEmail(email, 'Test User');
      await service.sendPasswordResetEmail(email, 'token123');

      mockTransporter.sendMail.mock.calls.forEach((call) => {
        expect(call[0].from).toBe('test@example.com');
      });
    });
  });
});
