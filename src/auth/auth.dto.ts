import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUrl,
  IsEnum,
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

function IsCnic() {
  return Matches(/^\d{13}$/, {
    message: 'CNIC must be a 13-digit number',
  });
}

export class SignupDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', required: false })
  @ValidateIf((o) => !o.firebaseId)
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'firebase-uid-123', required: false })
  @ValidateIf((o) => !o.password)
  @IsString()
  firebaseId?: string;

  @ApiProperty({ example: 'Faizan Ali' })
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
    example: '3520212345678',
    description: '13-digit CNIC number (numbers only)',
  })
  @IsString()
  @IsCnic()
  cnic: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', required: false })
  @IsOptional()
  @IsString()
  profileImage?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'teacher1@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', required: false })
  @ValidateIf((o) => !o.firebaseId)
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'firebase-uid-123', required: false })
  @ValidateIf((o) => !o.password)
  @IsString()
  firebaseId?: string;
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

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'Faizan Ali',
    description: 'Updated name of the user',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/profile.jpg',
    description: 'Profile image URL',
  })
  @IsOptional()
  @IsUrl()
  profileImage?: string;

  @ApiPropertyOptional({
    example: '3520212345678',
    description: '13-digit CNIC number (numbers only)',
  })
  @IsOptional()
  @IsCnic()
  cnic?: string;
}
