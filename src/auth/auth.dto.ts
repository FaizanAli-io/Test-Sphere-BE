import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class SignupDto {
  @ApiProperty({
    example: 'teacher1@example.com',
    description: 'Unique email of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Faizan Ali', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.TEACHER,
    description: 'Role of the user',
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'TCH123',
    description: 'Unique identifier (roll no / teacher ID)',
  })
  @IsString()
  @Length(3, 20)
  uniqueIdentifier: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'newSecurePassword123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
