import {
  IsIn,
  IsUrl,
  IsInt,
  IsEnum,
  IsArray,
  IsNumber,
  IsString,
  IsDateString,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";
import { Type } from "class-transformer";
import { LogType } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ===== Image-based logs (SCREENSHOT, WEBCAM_PHOTO) =====

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

// ===== System event logs =====

export class FocusChangeLogEntry {
  @ApiProperty({
    description: "Duration in milliseconds that the user was away from the test window",
    example: 5000,
  })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: "ISO timestamp when the focus was regained",
    example: "2025-11-17T12:30:45.000Z",
  })
  @IsDateString()
  loggedAt: string;
}

export class MouseClickLogEntry {
  @ApiProperty({
    description: "Type of mouse button clicked",
    enum: ["LEFT", "RIGHT"],
    example: "LEFT",
  })
  @IsIn(["LEFT", "RIGHT"])
  type: "LEFT" | "RIGHT";

  @ApiProperty({
    description: "Screen coordinates [x, y] where the click occurred",
    example: [450, 320],
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  position: [number, number];

  @ApiProperty({
    description: "ISO timestamp when the click occurred",
    example: "2025-11-17T12:30:45.000Z",
  })
  @IsDateString()
  loggedAt: string;
}

export class KeystrokeLogEntry {
  @ApiProperty({
    description: "The key that was pressed",
    example: "Enter",
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: "ISO timestamp when the keystroke occurred",
    example: "2025-11-17T12:30:45.000Z",
  })
  @IsDateString()
  loggedAt: string;
}

// Custom validator for dynamic meta validation
function ValidateMetaByLogType(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "validateMetaByLogType",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as CreateProctoringLogDto;

          if (!Array.isArray(value)) {
            return false;
          }

          // Validate based on logType
          switch (obj.logType) {
            case LogType.SCREENSHOT:
            case LogType.WEBCAM_PHOTO:
              return value.every(
                (item) =>
                  typeof item.fileId === "string" &&
                  typeof item.image === "string" &&
                  typeof item.takenAt === "string",
              );
            case LogType.FOCUS_CHANGE:
              return value.every(
                (item) => typeof item.duration === "number" && typeof item.loggedAt === "string",
              );
            case LogType.MOUSECLICK:
              return value.every(
                (item) =>
                  (item.type === "LEFT" || item.type === "RIGHT") &&
                  Array.isArray(item.position) &&
                  item.position.length === 2 &&
                  typeof item.loggedAt === "string",
              );
            case LogType.KEYSTROKE:
              return value.every(
                (item) => typeof item.key === "string" && typeof item.loggedAt === "string",
              );
            default:
              return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as CreateProctoringLogDto;
          return `meta array does not match the expected structure for logType ${obj.logType}`;
        },
      },
    });
  };
}

// ===== Main DTO =====

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
      "Metadata array that varies based on logType. For SCREENSHOT/WEBCAM_PHOTO: ImageLogEntry[], for FOCUS_CHANGE: FocusChangeLogEntry[], for MOUSECLICK: MouseClickLogEntry[], for KEYSTROKE: KeystrokeLogEntry[]",
  })
  @IsArray()
  @ValidateMetaByLogType()
  meta?: ImageLogEntry[] | FocusChangeLogEntry[] | MouseClickLogEntry[] | KeystrokeLogEntry[];
}
