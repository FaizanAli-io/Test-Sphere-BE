import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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
    await this.emailService.sendOtpEmail(email, otp);
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
