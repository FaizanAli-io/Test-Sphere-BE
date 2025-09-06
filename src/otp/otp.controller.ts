import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OtpService } from './otp.service';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';

@ApiTags('OTP')
@Controller('otp')
@ApiResponse({ status: 500, description: 'Internal server error' })
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email' })
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    try {
      const otp = await this.otpService.generateOtp();
      await this.otpService.saveOtp(sendOtpDto.email, otp);
      await this.otpService.sendOtpEmail(sendOtpDto.email, otp);

      return { message: 'OTP sent to your email.' };
    } catch (error) {
      throw new HttpException(
        'Failed to send OTP',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const isValid = await this.otpService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.code,
    );

    if (!isValid) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    return { message: 'OTP verified successfully' };
  }
}
