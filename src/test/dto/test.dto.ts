import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  SHORT_ANSWER = 'SHORT_ANSWER',
  ESSAY = 'ESSAY',
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
  date: Date;

  @ApiProperty({ description: 'Class ID this test belongs to' })
  @IsNumber()
  classId: number;
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

export class SubmitAnswerDto {
  @ApiProperty({ description: 'ID of the question being answered' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: "Student's answer" })
  @IsString()
  answer: string;
}

export class GradeTestDto {
  @ApiProperty({ description: 'ID of the test submission to grade' })
  @IsNumber()
  submissionId: number;

  @ApiProperty({
    description: 'Array of grades for each question',
    type: [Number],
  })
  @IsArray()
  @IsNumber({}, { each: true })
  grades: number[];
}

export class BulkQuestionDto {
  @ApiProperty({ description: 'Test ID these questions belong to' })
  @IsNumber()
  testId: number;

  @ApiProperty({ description: 'The question text' })
  @IsString()
  text: string;

  @ApiProperty({ enum: QuestionType, description: 'Type of question' })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'Possible answers for multiple choice questions',
    required: false,
  })
  @IsArray()
  @IsOptional()
  options?: string[];

  @ApiProperty({ description: 'Base64 encoded image', required: false })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty({ description: 'Correct answer', required: false })
  @IsString()
  @IsOptional()
  answer?: string;

  @ApiProperty({ description: 'Points for this question' })
  @IsNumber()
  @Min(0)
  points: number;
}

export class SubmitQuestionsDto {
  @ApiProperty({
    type: [BulkQuestionDto],
    description: 'Array of questions to submit',
  })
  @IsArray()
  questions: BulkQuestionDto[];
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

export class UpdateQuestionDto extends QuestionDto {
  @ApiProperty({
    description: 'Question ID for updating existing question',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  id?: number;
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
