import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsArray,
  ValidateNested,
  IsString,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartSubmissionDto {
  @ApiProperty({ example: 1, description: 'ID of the test to start' })
  @IsInt()
  testId: number;
}

export class AnswerDto {
  @ApiProperty({ example: 12, description: 'Question ID being answered' })
  @IsInt()
  questionId: number;

  @ApiProperty({
    example: '2',
    description: 'The selected answer or text response',
  })
  @IsString()
  answer: string;
}

export class SubmitTestDto {
  @ApiProperty({
    type: [AnswerDto],
    description: 'List of answers for the submitted test',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}

export class GradeAnswerDto {
  @ApiProperty({ example: 10, description: 'ID of the answer to grade' })
  @IsInt()
  answerId: number;

  @ApiProperty({ example: 4, description: 'Marks obtained by the student' })
  @IsNumber()
  obtainedMarks: number;
}

export class GradeSubmissionDto {
  @ApiProperty({
    type: [GradeAnswerDto],
    description: 'List of graded answers',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeAnswerDto)
  answers: GradeAnswerDto[];
}
