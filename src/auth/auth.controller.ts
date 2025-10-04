import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';

import {
  LoginDto,
  SignupDto,
  VerifyOtpDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from './dto';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Register a new user and send OTP for verification',
  })
  @ApiResponse({ status: 201, description: 'User registered and OTP sent.' })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP to activate account' })
  @ApiResponse({ status: 200, description: 'Account verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and return JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or unverified account.',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Send OTP to email for password reset' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully for password reset.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using valid OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successful.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
