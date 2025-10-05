import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TestStatus, QuestionType } from '@prisma/client';

export class CreateTestDto {
  @ApiProperty()
  @IsInt()
  classId: number;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;

  @ApiProperty({ enum: TestStatus, default: TestStatus.DRAFT })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;
}

export class UpdateTestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiProperty({ required: false, enum: TestStatus })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus;
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsInt()
  testId: number;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Required only for MULTIPLE_CHOICE questions',
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  options?: string[];

  @ApiProperty({
    required: false,
    description: 'Required for MULTIPLE_CHOICE and TRUE_FALSE questions',
  })
  @ValidateIf(
    (o) =>
      o.type === QuestionType.MULTIPLE_CHOICE ||
      o.type === QuestionType.TRUE_FALSE,
  )
  @IsInt()
  correctAnswer?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxMarks?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateQuestionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false, enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiProperty({
    required: false,
    type: [String],
    description: 'Required only if type is MULTIPLE_CHOICE',
  })
  @ValidateIf((o) => o.type === QuestionType.MULTIPLE_CHOICE)
  @IsArray()
  options?: string[];

  @ApiProperty({
    required: false,
    description: 'Applicable only for MULTIPLE_CHOICE or TRUE_FALSE questions',
  })
  @ValidateIf(
    (o) =>
      o.type === QuestionType.MULTIPLE_CHOICE ||
      o.type === QuestionType.TRUE_FALSE,
  )
  @IsInt()
  correctAnswer?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  maxMarks?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  image?: string;
}

export class AddQuestionsDto {
  @ApiProperty({ type: [CreateQuestionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions: CreateQuestionDto[];
}
