import {
  IsUrl,
  IsInt,
  IsEnum,
  IsArray,
  IsString,
  IsOptional,
  IsDateString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { LogType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ImageLogEntry {
  @ApiProperty({
    description: "ImageKit fileId for this uploaded image",
    example: "670f8cd9f933d06b9ccf37b1",
  })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: "Public URL of the uploaded image",
    example: "https://ik.imagekit.io/abcd/test-monitoring/webcam_123.jpg",
  })
  @IsUrl()
  image: string;

  @ApiProperty({
    description: "ISO timestamp when the image was taken",
    example: "2025-10-10T12:30:45.000Z",
  })
  @IsDateString()
  takenAt: string;
}

export class CreateProctoringLogDto {
  @ApiProperty({
    description: "ID of the submission this log belongs to",
    example: 42,
  })
  @IsInt()
  submissionId: number;

  @ApiProperty({
    description: "Type of proctoring log",
    enum: LogType,
    example: LogType.SCREENSHOT,
  })
  @IsEnum(LogType)
  logType: LogType;

  @ApiPropertyOptional({
    description:
      "Metadata array for screenshot or webcam photo logs. Each entry contains fileId, image URL, and timestamp.",
    type: [ImageLogEntry],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImageLogEntry)
  @IsArray()
  meta?: ImageLogEntry[];
}
