import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@config/config.service";

import {
  LoginDto,
  SignupDto,
  VerifyOtpDto,
  UpdateProfileDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from "./auth.dto";
import { UserRole } from "@prisma/client";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  OTP_LIFETIME = 10 * 60 * 1000;

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async buildAuthResponse(user: any) {
    const token = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      {
        expiresIn: "7d",
        secret: this.configService.get("JWT_SECRET"),
      },
    );

    return {
      accessToken: token,
      user,
    };
  }

  async signup(dto: SignupDto) {
    // --- Find existing user by email ---
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        firebaseId: true,
        password: true,
        verified: true,
        role: true,
      },
    });

    if (existingUser) {
      // --- Case 1: Existing Google → adding password ---
      if (existingUser.firebaseId && dto.password && !existingUser.password) {
        const updatedUser = await this.prisma.user.update({
          where: { email: dto.email },
          data: { password: await bcrypt.hash(dto.password, 10) },
        });

        return {
          message: "Password linked successfully. You can now log in with email or Google.",
          ...(await this.buildAuthResponse(updatedUser)),
        };
      }

      // --- Case 2: Existing Password → adding Google ---
      if (existingUser.password && dto.firebaseId && !existingUser.firebaseId) {
        const updatedUser = await this.prisma.user.update({
          where: { email: dto.email },
          data: { firebaseId: dto.firebaseId, verified: true },
        });

        return {
          message: "Google account linked successfully. You can now log in with email or Google.",
          ...(await this.buildAuthResponse(updatedUser)),
        };
      }

      // --- Conflicts ---
      if (existingUser.verified)
        throw new ConflictException("Account already registered and verified.");

      if (existingUser.firebaseId && dto.firebaseId)
        throw new ConflictException("Account already exists and linked to Google login.");

      if (existingUser.password && dto.password)
        throw new ConflictException("Account already exists and linked to password login.");

      throw new ConflictException("Account already registered but not verified.");
    }

    // --- Ensure CNIC is unique ---
    if (dto.cnic) {
      const cnicUser = await this.prisma.user.findUnique({
        where: { cnic: dto.cnic },
        select: { id: true },
      });
      if (cnicUser) throw new ConflictException("CNIC is already registered.");
    }

    // --- Google signup ---
    if (dto.firebaseId) {
      const user = await this.prisma.user.create({
        data: {
          verified: true,
          name: dto.name,
          role: dto.role,
          email: dto.email,
          firebaseId: dto.firebaseId,
          profileImage: dto.profileImage,
          cnic: dto.cnic,
        },
      });

      return {
        message: "Signup successful via Google. Account verified.",
        ...(await this.buildAuthResponse(user)),
      };
    }

    // --- Email signup ---
    if (!dto.password) throw new BadRequestException("Password is required for email signup.");

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: dto.name,
          role: dto.role,
          email: dto.email,
          password: hashedPassword,
          profileImage: dto.profileImage,
          cnic: dto.cnic,
          verified: false,
          otp,
          otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
        },
      });

      await this.emailService.sendOtpEmail(createdUser.email, otp);
      return createdUser;
    });

    return {
      message: "Signup successful. OTP sent to email for verification.",
    };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, verified: true },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.verified) throw new BadRequestException("Account is already verified.");

    const otp = this.generateOtp();

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);

    return {
      message: "OTP resent successfully. Check your email.",
      otpResent: true,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.verified) throw new BadRequestException("Account is already verified.");

    if (!user.otp || !user.otpExpiry) throw new BadRequestException("No OTP generated");

    if (user.otp !== dto.otp) throw new BadRequestException("Invalid OTP");

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
        message: "OTP expired. A new OTP has been sent to your email.",
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

    return { message: "Account verified successfully.", verified: true };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("Invalid credentials");

    if (dto.firebaseId) {
      if (!user.firebaseId)
        throw new UnauthorizedException("No Google Login exists for this account");

      if (user.firebaseId !== dto.firebaseId)
        throw new UnauthorizedException("Invalid Google Login for this account");

      if (!user.verified) throw new UnauthorizedException("Account not verified");

      const token = await this.buildAuthResponse(user);
      return { accessToken: token.accessToken, user };
    }

    if (!dto.password) throw new BadRequestException("Password is required");
    if (!user.verified)
      throw new UnauthorizedException("Account not verified. Please verify via OTP.");

    if (!user.password)
      throw new UnauthorizedException(
        "This account uses Firebase login. Please sign in with Google.",
      );

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException("Invalid credentials");

    const token = await this.buildAuthResponse(user);
    return { accessToken: token.accessToken, user };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException("User not found");

    const otp = this.generateOtp();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp,
        otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
      },
    });

    await this.emailService.sendOtpEmail(user.email, otp);
    return { message: "OTP sent to your email for password reset." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("User not found");
    if (user.otp !== dto.otp) throw new BadRequestException("Invalid OTP");
    if (user.otpExpiry ? user.otpExpiry < new Date() : false)
      throw new BadRequestException("OTP expired");

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiry: null,
        password: hashedPassword,
      },
    });

    return { message: "Password reset successful." };
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
        cnic: true,
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name ?? user.name,
        profileImage: dto.profileImage ?? user.profileImage,
        cnic: dto.cnic ?? user.cnic,
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        verified: true,
        createdAt: true,
        profileImage: true,
        cnic: true,
      },
    });

    return updatedUser;
  }
}
