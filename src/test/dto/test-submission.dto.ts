import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class AnswerSubmissionDto {
  @ApiProperty({ description: 'ID of the question being answered' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: "The student's answer text" })
  @IsString()
  answer: string;
}

export class AnswerGradeDto {
  @ApiProperty({ description: 'ID of the question being graded' })
  @IsNumber()
  questionId: number;

  @ApiProperty({ description: 'Points awarded for this answer' })
  @IsNumber()
  points: number;

  @ApiProperty({
    description: 'Feedback for this specific answer',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class StartTestDto {
  @ApiProperty({ description: 'ID of the test to start' })
  @IsNumber()
  testId: number;
}

export class SubmitTestDto {
  @ApiProperty({ description: 'ID of the test submission' })
  @IsNumber()
  submissionId: number;

  @ApiProperty({
    description: 'Array of answer objects',
    type: [AnswerSubmissionDto],
  })
  @IsArray()
  answers: AnswerSubmissionDto[];
}

export class SubmitTestPhotosDto {
  @ApiProperty({ description: 'ID of the test submission' })
  @IsNumber()
  submissionId: number;

  @ApiProperty({ description: 'Base64 encoded photo data', type: [String] })
  @IsArray()
  @IsOptional()
  photos?: string[];

  @ApiProperty({
    description: 'Base64 encoded screenshot data',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  screenshots?: string[];
}

export class GradeSubmissionDto {
  @ApiProperty({ description: 'ID of the test submission to grade' })
  @IsNumber()
  submissionId: number;

  @ApiProperty({
    description: 'Array of grades for each answer',
    type: [AnswerGradeDto],
  })
  @IsArray()
  grades: AnswerGradeDto[];

  @ApiProperty({
    description: 'Overall feedback for the submission',
    required: false,
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
