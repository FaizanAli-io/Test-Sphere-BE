import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address to send the OTP to',
  })
  @IsEmail()
  email: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address to verify the OTP for',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'The 6-digit OTP code',
  })
  @IsString()
  @Length(6, 6)
  code: string;
}
