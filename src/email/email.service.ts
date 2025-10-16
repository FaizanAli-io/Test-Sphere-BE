import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Account Verification OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Account Verification</h2>
          <p>Your OTP for account verification is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; color: #333; border-radius: 5px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #666;">This OTP is valid for 10 minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this verification, please ignore this email.</p>
        </div>
      `,
      text: `Your OTP for account verification is: ${otp}. This OTP is valid for 10 minutes.`,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Welcome to Test Sphere',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Test Sphere!</h2>
          <p>Hi ${name},</p>
          <p>Your account has been successfully verified. Welcome to Test Sphere!</p>
          <p>You can now log in and start using our platform.</p>
          <br>
          <p>Best regards,</p>
          <p>The Test Sphere Team</p>
        </div>
      `,
      text: `Hi ${name}, Your account has been successfully verified. Welcome to Test Sphere! You can now log in and start using our platform. Best regards, The Test Sphere Team`,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: this.configService.get('SMTP_USER'),
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password.</p>
          <p>Click the link below to reset your password:</p>
          <div style="margin: 20px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>
          <p style="color: #666;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
      text: `You have requested to reset your password. Visit this link to reset your password: ${resetUrl}. This link will expire in 1 hour.`,
    });
  }
}
