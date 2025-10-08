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
} from './auth.dto';
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

  OTP_LIFETIME = 10 * 60 * 1000; // 10 minutes in milliseconds

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

  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.firebaseId) {
        throw new ConflictException(
          'Account already exists and is linked to Google/Firebase login.',
        );
      }
      if (existingUser.verified) {
        throw new ConflictException('Account already registered and verified.');
      }
      throw new ConflictException(
        'Account already registered but not verified.',
      );
    }

    // 🔹 Case 1: Firebase signup (instant verify, no OTP)
    if (dto.firebaseId) {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          firebaseId: dto.firebaseId,
          name: dto.name,
          role: dto.role,
          uniqueIdentifier: dto.uniqueIdentifier,
          profileImage: dto.profileImage,
          verified: true,
        },
      });
      const token = await this.signToken(user.id, user.email, user.role);
      return {
        message: 'Signup successful via Firebase. Account verified.',
        accessToken: token,
        user,
      };
    }

    // 🔹 Case 2: Password-based signup (OTP verification required)
    if (!dto.password) {
      throw new BadRequestException('Password is required for email signup.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const otp = this.generateOtp();

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        uniqueIdentifier: dto.uniqueIdentifier,
        profileImage: dto.profileImage,
        otp,
        otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);

    return {
      message: 'Signup successful. OTP sent to email for verification.',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('User not found');
    if (!user.otp || !user.otpExpiry)
      throw new BadRequestException('No OTP generated');
    if (user.otp !== dto.otp) throw new BadRequestException('Invalid OTP');

    if (user.otpExpiry < new Date()) {
      const newOtp = this.generateOtp();

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          otp: newOtp,
          otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
        },
      });

      await this.emailService.sendOtpEmail(user.email, newOtp);

      return {
        message: 'OTP expired. A new OTP has been sent to your email.',
        otpResent: true,
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        verified: true,
        otpExpiry: null,
      },
    });

    return { message: 'Account verified successfully.', verified: true };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException('Invalid credentials');

    // 🔹 Firebase-based login
    if (dto.firebaseId) {
      if (user.firebaseId !== dto.firebaseId) {
        throw new UnauthorizedException('Invalid Firebase ID for this account');
      }

      if (!user.verified) {
        throw new UnauthorizedException('Account not verified');
      }

      const token = await this.signToken(user.id, user.email, user.role);
      return { accessToken: token, user };
    }

    // 🔹 Password-based login
    if (!dto.password) throw new BadRequestException('Password is required');
    if (!user.verified)
      throw new UnauthorizedException(
        'Account not verified. Please verify via OTP.',
      );

    if (!user.password)
      throw new UnauthorizedException(
        'This account uses Firebase login. Please sign in with Google.',
      );

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    const token = await this.signToken(user.id, user.email, user.role);
    return { accessToken: token, user };
  }

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
        otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);
    return { message: 'OTP sent to your email for password reset.' };
  }

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

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        verified: true,
        createdAt: true,
        profileImage: true,
        uniqueIdentifier: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
