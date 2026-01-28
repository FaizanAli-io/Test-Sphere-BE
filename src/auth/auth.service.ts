import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import bcrypt from "bcryptjs";
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
import { User, UserRole } from "../typeorm/entities";
import { EmailService } from "../email/email.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  OTP_LIFETIME = 10 * 60 * 1000;

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async buildAuthResponse(user: any) {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: token,
      user,
    };
  }

  async signup(dto: SignupDto) {
    // --- Find existing user by email ---
    const existingUser = await this.userRepository.findOne({
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
        existingUser.password = await bcrypt.hash(dto.password, 10);
        const updatedUser = await this.userRepository.save(existingUser);

        return {
          message: "Password linked successfully. You can now log in with email or Google.",
          ...(await this.buildAuthResponse(updatedUser)),
        };
      }

      // --- Case 2: Existing Password → adding Google ---
      if (existingUser.password && dto.firebaseId && !existingUser.firebaseId) {
        existingUser.firebaseId = dto.firebaseId;
        existingUser.verified = true;
        const updatedUser = await this.userRepository.save(existingUser);

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
      const cnicUser = await this.userRepository.findOne({
        where: { cnic: dto.cnic },
        select: { id: true },
      });
      if (cnicUser) throw new ConflictException("CNIC is already registered.");
    }

    // --- Google signup ---
    if (dto.firebaseId) {
      const user = this.userRepository.create({
        verified: true,
        name: dto.name,
        role: dto.role,
        email: dto.email,
        firebaseId: dto.firebaseId,
        profileImage: dto.profileImage,
        cnic: dto.cnic,
      });

      const savedUser = await this.userRepository.save(user);

      return {
        message: "Signup successful via Google. Account verified.",
        ...(await this.buildAuthResponse(savedUser)),
      };
    }

    // --- Email signup ---
    if (!dto.password) throw new BadRequestException("Password is required for email signup.");

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const otp = this.generateOtp();

    const user = this.userRepository.create({
      name: dto.name,
      role: dto.role,
      email: dto.email,
      password: hashedPassword,
      profileImage: dto.profileImage,
      cnic: dto.cnic,
      verified: false,
      otp,
      otpExpiry: new Date(Date.now() + this.OTP_LIFETIME),
    });

    const createdUser = await this.userRepository.save(user);
    await this.emailService.sendOtpEmail(createdUser.email, otp);

    return {
      message: "Signup successful. OTP sent to email for verification.",
    };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: { id: true, email: true, verified: true },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.verified) throw new BadRequestException("Account is already verified.");

    const otp = this.generateOtp();

    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + this.OTP_LIFETIME);
    await this.userRepository.save(user);

    await this.emailService.sendOtpEmail(user.email, otp);

    return {
      message: "OTP resent successfully. Check your email.",
      otpResent: true,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.verified) throw new BadRequestException("Account is already verified.");

    if (!user.otp || !user.otpExpiry) throw new BadRequestException("No OTP generated");

    if (user.otp !== dto.otp) throw new BadRequestException("Invalid OTP");

    if (user.otpExpiry < new Date()) {
      const newOtp = this.generateOtp();

      user.otp = newOtp;
      user.otpExpiry = new Date(Date.now() + this.OTP_LIFETIME);
      await this.userRepository.save(user);

      await this.emailService.sendOtpEmail(user.email, newOtp);

      return {
        message: "OTP expired. A new OTP has been sent to your email.",
        otpResent: true,
      };
    }

    user.otp = null;
    user.verified = true;
    user.otpExpiry = null;
    await this.userRepository.save(user);

    return { message: "Account verified successfully.", verified: true };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
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
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) throw new NotFoundException("User not found");

    const otp = this.generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + this.OTP_LIFETIME);
    await this.userRepository.save(user);

    await this.emailService.sendOtpEmail(user.email, otp);
    return { message: "OTP sent to your email for password reset." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("User not found");
    if (user.otp !== dto.otp) throw new BadRequestException("Invalid OTP");
    if (user.otpExpiry ? user.otpExpiry < new Date() : false)
      throw new BadRequestException("OTP expired");

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.otp = null;
    user.otpExpiry = null;
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return { message: "Password reset successful." };
  }

  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.profileImage !== undefined) user.profileImage = dto.profileImage;
    if (dto.cnic !== undefined) user.cnic = dto.cnic;

    const updatedUser = await this.userRepository.save(user);

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      role: updatedUser.role,
      email: updatedUser.email,
      verified: updatedUser.verified,
      createdAt: updatedUser.createdAt,
      profileImage: updatedUser.profileImage,
      cnic: updatedUser.cnic,
    };
  }
}
