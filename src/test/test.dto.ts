import {
  Min,
  IsInt,
  IsEnum,
  IsArray,
  IsObject,
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
  Validate,
  ValidateIf,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { TestStatus, QuestionType } from '../typeorm/entities';
import { IsValidPoolConfig } from './validators/pool-config.validator';

export class CreateTestDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  classId: number;

  @ApiProperty({ example: 'Midterm Algebra Test' })
  @IsString()
  title: string;

  @ApiProperty({
    required: false,
    example: 'Covers chapters 1-5 on linear equations',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 90, description: 'Duration in minutes' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ example: '2025-10-10T09:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2025-10-10T10:30:00.000Z' })
  @IsDateString()
  endAt: string;

  @ApiProperty({
    enum: TestStatus,
    default: TestStatus.DRAFT,
    example: TestStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;
}

export class UpdateTestDto {
  @ApiProperty({ required: false, example: 'Updated Algebra Midterm Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, example: 'Now includes chapter 6' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, example: 100 })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ required: false, example: '2025-10-10T09:15:00.000Z' })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false, example: '2025-10-10T10:45:00.000Z' })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({
    required: false,
    enum: TestStatus,
    example: TestStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;
}

export class CreateQuestionDto {
  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  questionPoolId?: number;

  @ApiProperty({ example: 'What is the derivative of x^2?' })
  @IsString()
  text: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Required only for MULTIPLE_CHOICE questions',
    example: ['2x', 'x', 'x^2', '2'],
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  options?: string[];

  @ApiProperty({
    required: false,
    description: 'Required for MULTIPLE_CHOICE and TRUE_FALSE questions',
    example: 0,
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE || o.type === QuestionType.TRUE_FALSE)
  @IsInt()
  correctAnswer?: number;

  @ApiProperty({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxMarks: number;

  @ApiProperty({
    required: false,
    example: 'https://cdn.example.com/images/derivative-q1.png',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateQuestionDto {
  @ApiProperty({ required: false, example: 'What is the derivative of x^3?' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({
    required: false,
    enum: QuestionType,
    example: QuestionType.TRUE_FALSE,
  })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Required only if type is MULTIPLE_CHOICE',
    example: ['True', 'False'],
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  options?: string[];

  @ApiProperty({
    required: false,
    description: 'Applicable only for MULTIPLE_CHOICE or TRUE_FALSE questions',
    example: 1,
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE || o.type === QuestionType.TRUE_FALSE)
  @IsInt()
  correctAnswer?: number;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsInt()
  maxMarks?: number;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  questionPoolId?: number;

  @ApiProperty({
    required: false,
    example: 'https://cdn.example.com/images/derivative-q2.png',
  })
  @IsOptional()
  @IsString()
  image?: string;
}

export class AddQuestionsDto {
  @ApiProperty({
    type: [CreateQuestionDto],
    example: [
      {
        text: 'What is the derivative of x^2?',
        type: 'MULTIPLE_CHOICE',
        options: ['2x', 'x', 'x^2', '2'],
        correctAnswer: 0,
        maxMarks: 5,
        questionPoolId: 1,
        image: 'https://cdn.example.com/images/derivative-q1.png',
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}

export class UpdateTestConfigDto {
  @IsBoolean()
  @IsOptional()
  pooling?: boolean;

  @IsBoolean()
  @IsOptional()
  webcamRequired?: boolean;

  @IsBoolean()
  @IsOptional()
  multipleScreens?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxViolationCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxViolationDuration?: number;
}

export class CreateQuestionPoolDto {
  @ApiProperty({ example: 'Algebra MCQs' })
  @IsString()
  title: string;

  @ApiProperty({ example: { MULTIPLE_CHOICE: 5, TRUE_FALSE: 5, SHORT_ANSWER: 5, LONG_ANSWER: 5 } })
  @IsObject()
  @Validate(IsValidPoolConfig)
  config: Record<string, number>;

  @ApiProperty({ required: false, example: true, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateQuestionPoolDto {
  @ApiProperty({ required: false, example: 'Algebra MCQs (updated)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, example: { MULTIPLE_CHOICE: 3 } })
  @IsOptional()
  @IsObject()
  @Validate(IsValidPoolConfig)
  config?: Record<string, number>;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class BulkQuestionPoolUpdateDto {
  @ApiProperty({ example: [1, 2, 3], description: 'One ID or an array of IDs' })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  questionIds: number[];
}
