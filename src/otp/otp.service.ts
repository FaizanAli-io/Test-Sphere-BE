import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async generateOtp(): Promise<string> {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async saveOtp(email: string, otp: string): Promise<void> {
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpiry,
        otpAttempts: 0,
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });

    await transporter.sendMail({
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Account Verification OTP',
      text: `Your OTP for account verification is: ${otp}. This OTP is valid for 10 minutes.`,
    });
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        otp: true,
        otpExpiry: true,
        otpAttempts: true,
        otpLastAttempt: true,
      },
    });

    if (!user || !user.otp || !user.otpExpiry) {
      return false;
    }

    const now = new Date();

    // Check if OTP is expired
    if (now > user.otpExpiry) {
      return false;
    }

    // Check for rate limiting
    if (user.otpAttempts >= 3) {
      const lastAttempt = user.otpLastAttempt;
      if (
        lastAttempt &&
        now.getTime() - lastAttempt.getTime() < 15 * 60 * 1000
      ) {
        // 15 minutes lockout
        return false;
      }
      // Reset attempts after lockout period
      await this.resetOtpAttempts(email);
    }

    // Update attempt count
    await this.incrementOtpAttempts(email);

    return user.otp === code;
  }

  private async incrementOtpAttempts(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        otpAttempts: { increment: 1 },
        otpLastAttempt: new Date(),
      },
    });
  }

  private async resetOtpAttempts(email: string): Promise<void> {
    await this.prisma.user.update({
      where: { email },
      data: {
        otpAttempts: 0,
        otpLastAttempt: null,
      },
    });
  }
}
