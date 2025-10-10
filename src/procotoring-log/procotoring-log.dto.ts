import {
  IsInt,
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LogType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ImageLogEntry {
  @ApiProperty({
    description: 'URL or base64 string of the captured image',
    example: 'https://example.com/screenshot-1.png',
  })
  @IsString()
  image: string;

  @ApiProperty({
    description: 'ISO timestamp when the image was taken',
    example: '2025-10-10T12:30:45.000Z',
  })
  @IsDateString()
  takenAt: string;
}

export class CreateProctoringLogDto {
  @ApiProperty({
    description: 'ID of the submission this log belongs to',
    example: 42,
  })
  @IsInt()
  submissionId: number;

  @ApiProperty({
    description: 'Type of proctoring log',
    enum: LogType,
    example: LogType.SCREENSHOT,
  })
  @IsEnum(LogType)
  logType: LogType;

  @ApiPropertyOptional({
    description:
      'Metadata array for screenshot or webcam photo logs. Each entry contains an image and timestamp.',
    type: [ImageLogEntry],
    example: [
      {
        image: 'https://example.com/webcam_1.jpg',
        takenAt: '2025-10-10T12:45:00.000Z',
      },
      {
        image: 'https://example.com/webcam_2.jpg',
        takenAt: '2025-10-10T12:47:00.000Z',
      },
    ],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageLogEntry)
  @IsArray()
  meta?: ImageLogEntry[];
}
