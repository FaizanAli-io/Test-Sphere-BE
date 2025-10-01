import { UserRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength, Matches } from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'The password for the account',
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'student',
    description: 'The role of the user (student or teacher)',
    enum: UserRole,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    example: 'john-doe-123',
    description:
      'Unique identifier for the user (6-20 alphanumeric characters with hyphens allowed)',
  })
  @IsString()
  @Matches(/^[a-z0-9-]{6,20}$/i, {
    message: 'Unique ID must be 6-20 alphanumeric characters (hyphens allowed)',
  })
  uniqueIdentifier: string;
}
