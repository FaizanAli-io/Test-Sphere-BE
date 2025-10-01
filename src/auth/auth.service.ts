import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: signupDto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const existingIdentifier = await this.prisma.user.findFirst({
      where: {
        uniqueIdentifier: signupDto.uniqueIdentifier.toLowerCase(),
      },
    });

    if (existingIdentifier) {
      throw new ConflictException('Unique identifier already exists');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...signupDto,
        password: hashedPassword,
      },
    });

    const token = this.generateToken(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  private generateToken(user: { id: number; email: string; role: string }) {
    return this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '2h',
      },
    );
  }

  async forgotPassword(email: string) {
    // This functionality should be implemented with OTP service
    // For now, return a placeholder response
    return { message: 'OTP sent to your email.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    // This functionality should be implemented with OTP service and password reset
    // For now, return a placeholder response
    return {
      message:
        'Password reset successful. You can now log in with your new password.',
    };
  }
}
