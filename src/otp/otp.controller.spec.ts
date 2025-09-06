import { Test, TestingModule } from '@nestjs/testing';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { HttpException } from '@nestjs/common';

describe('OtpController', () => {
  let controller: OtpController;
  let otpService: OtpService;

  const mockOtpService = {
    generateOtp: jest.fn(),
    saveOtp: jest.fn(),
    sendOtpEmail: jest.fn(),
    verifyOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OtpController],
      providers: [
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    controller = module.get<OtpController>(OtpController);
    otpService = module.get<OtpService>(OtpService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendOtp', () => {
    const sendOtpDto = { email: 'test@example.com' };

    it('should send OTP successfully', async () => {
      mockOtpService.generateOtp.mockResolvedValue('123456');
      mockOtpService.saveOtp.mockResolvedValue(undefined);
      mockOtpService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.sendOtp(sendOtpDto);

      expect(result).toEqual({ message: 'OTP sent to your email.' });
      expect(mockOtpService.generateOtp).toHaveBeenCalled();
      expect(mockOtpService.saveOtp).toHaveBeenCalledWith(
        sendOtpDto.email,
        '123456',
      );
      expect(mockOtpService.sendOtpEmail).toHaveBeenCalledWith(
        sendOtpDto.email,
        '123456',
      );
    });

    it('should handle errors when sending OTP', async () => {
      mockOtpService.generateOtp.mockRejectedValue(new Error('Failed'));

      await expect(controller.sendOtp(sendOtpDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('verifyOtp', () => {
    const verifyOtpDto = {
      email: 'test@example.com',
      code: '123456',
    };

    it('should verify OTP successfully', async () => {
      mockOtpService.verifyOtp.mockResolvedValue(true);

      const result = await controller.verifyOtp(verifyOtpDto);

      expect(result).toEqual({ message: 'OTP verified successfully' });
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(
        verifyOtpDto.email,
        verifyOtpDto.code,
      );
    });

    it('should throw error for invalid OTP', async () => {
      mockOtpService.verifyOtp.mockResolvedValue(false);

      await expect(controller.verifyOtp(verifyOtpDto)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
