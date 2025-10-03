import { ApiProperty } from '@nestjs/swagger';
import {
  Min,
  Max,
  IsEnum,
  IsArray,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
} from 'class-validator';

export enum QuestionType {
  TRUE_FALSE = 'TRUE_FALSE',
  LONG_ANSWER = 'LONG_ANSWER',
  SHORT_ANSWER = 'SHORT_ANSWER',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
}

export class QuestionDto {
  @ApiProperty({ description: 'The question text' })
  @IsString()
  text: string;

  @ApiProperty({ enum: QuestionType, description: 'Type of question' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ description: 'Points for this question' })
  @IsNumber()
  @Min(0)
  points: number;

  @ApiProperty({
    description: 'Possible answers for multiple choice questions',
    required: false,
  })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiProperty({ description: 'Correct answer(s)', required: false })
  @IsArray()
  @IsOptional()
  correctAnswers?: string[];
}

export class AddQuestionsDto {
  @ApiProperty({
    type: [QuestionDto],
    description: 'Array of questions to add',
  })
  @IsArray()
  questions: QuestionDto[];
}

export class UpdateQuestionDto extends QuestionDto {
  @ApiProperty({
    description: 'Question ID for updating existing question',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  id?: number;
}

export class CreateTestDto {
  @ApiProperty({ description: 'Title of the test' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the test' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Duration of the test in minutes' })
  @IsNumber()
  @Min(1)
  @Max(480) // Maximum 8 hours
  duration: number;

  @ApiProperty({ description: 'Date when the test starts' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Class ID this test belongs to' })
  @IsNumber()
  classId: number;
}

export class UpdateTestDto {
  @ApiProperty({ description: 'Title of the test', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Description of the test', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Duration of the test in minutes',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(480)
  @IsOptional()
  duration?: number;

  @ApiProperty({ description: 'Date when the test starts', required: false })
  @IsOptional()
  date?: Date;

  @ApiProperty({ description: 'Whether the test is disabled', required: false })
  @IsOptional()
  disableTime?: boolean;
}

export class EditTestDto extends UpdateTestDto {
  @ApiProperty({
    type: [UpdateQuestionDto],
    description: 'Array of questions to update/add',
    required: false,
  })
  @IsArray()
  @IsOptional()
  questions?: UpdateQuestionDto[];

  @ApiProperty({ description: 'Feedback for the submission', required: false })
  @IsString()
  @IsOptional()
  feedback?: string;
}
