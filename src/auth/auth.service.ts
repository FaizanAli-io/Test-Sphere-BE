import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

import {
  LoginDto,
  SignupDto,
  VerifyOtpDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from './dto';
import { UserRole } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // SIGNUP
  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const otp = this.generateOtp();
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role || UserRole.student,
        uniqueIdentifier: dto.uniqueIdentifier,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        otp,
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);
    return { message: 'Signup successful, OTP sent to email.' };
  }

  // VERIFY OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.otp || !user.otpExpiry)
      throw new BadRequestException('No OTP generated');
    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiry < new Date())
      throw new BadRequestException('OTP expired');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        verified: true,
        otpExpiry: null,
      },
    });

    return { message: 'Account verified successfully.' };
  }

  // LOGIN
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Invalid credentials');
    if (!user.verified) throw new UnauthorizedException('Account not verified');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken(user.id, user.email, user.role);
    return { accessToken: token, user };
  }

  // FORGOT PASSWORD
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException('User not found');

    const otp = this.generateOtp();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);
    return { message: 'OTP sent to your email for password reset.' };
  }

  // RESET PASSWORD
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');
    if (user.otpExpiry ? user.otpExpiry < new Date() : false)
      throw new BadRequestException('OTP expired');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiry: null,
        password: hashedPassword,
      },
    });

    return { message: 'Password reset successful.' };
  }

  // UTILITIES
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async signToken(
    userId: number,
    email: string,
    role: UserRole,
  ): Promise<string> {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_SECRET,
    });
  }
}
