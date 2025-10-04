// import { ApiProperty } from '@nestjs/swagger';
// import {
//   Min,
//   IsEnum,
//   IsArray,
//   IsNumber,
//   IsString,
//   IsOptional,
// } from 'class-validator';
// import { QuestionType } from './test.dto';

// export class SubmitAnswerDto {
//   @ApiProperty({ description: 'ID of the question being answered' })
//   @IsNumber()
//   questionId: number;

//   @ApiProperty({ description: "Student's answer" })
//   @IsString()
//   answer: string;
// }

// export class GradeTestDto {
//   @ApiProperty({ description: 'ID of the test submission to grade' })
//   @IsNumber()
//   submissionId: number;

//   @ApiProperty({
//     description: 'Array of grades for each question',
//     type: [Number],
//   })
//   @IsArray()
//   @IsNumber({}, { each: true })
//   grades: number[];
// }

// export class BulkQuestionDto {
//   @ApiProperty({ description: 'Test ID these questions belong to' })
//   @IsNumber()
//   testId: number;

//   @ApiProperty({ description: 'The question text' })
//   @IsString()
//   text: string;

//   @ApiProperty({ enum: QuestionType, description: 'Type of question' })
//   @IsEnum(QuestionType)
//   type: QuestionType;

//   @ApiProperty({
//     description: 'Possible answers for multiple choice questions',
//     required: false,
//   })
//   @IsArray()
//   @IsOptional()
//   options?: string[];

//   @ApiProperty({ description: 'Base64 encoded image', required: false })
//   @IsString()
//   @IsOptional()
//   image?: string;

//   @ApiProperty({ description: 'Correct answer', required: false })
//   @IsString()
//   @IsOptional()
//   answer?: string;

//   @ApiProperty({ description: 'Points for this question' })
//   @IsNumber()
//   @Min(0)
//   points: number;
// }

// export class SubmitQuestionsDto {
//   @ApiProperty({
//     type: [BulkQuestionDto],
//     description: 'Array of questions to submit',
//   })
//   @IsArray()
//   questions: BulkQuestionDto[];
// }

// export class AnswerSubmissionDto {
//   @ApiProperty({ description: 'ID of the question being answered' })
//   @IsNumber()
//   questionId: number;

//   @ApiProperty({ description: "The student's answer text" })
//   @IsString()
//   answer: string;
// }

// export class AnswerGradeDto {
//   @ApiProperty({ description: 'ID of the question being graded' })
//   @IsNumber()
//   questionId: number;

//   @ApiProperty({ description: 'Points awarded for this answer' })
//   @IsNumber()
//   points: number;

//   @ApiProperty({
//     description: 'Feedback for this specific answer',
//     required: false,
//   })
//   @IsString()
//   @IsOptional()
//   feedback?: string;
// }

// export class StartTestDto {
//   @ApiProperty({ description: 'ID of the test to start' })
//   @IsNumber()
//   testId: number;
// }

// export class SubmitTestDto {
//   @ApiProperty({ description: 'ID of the test submission' })
//   @IsNumber()
//   submissionId: number;

//   @ApiProperty({
//     description: 'Array of answer objects',
//     type: [AnswerSubmissionDto],
//   })
//   @IsArray()
//   answers: AnswerSubmissionDto[];
// }

// export class SubmitTestPhotosDto {
//   @ApiProperty({ description: 'ID of the test submission' })
//   @IsNumber()
//   submissionId: number;

//   @ApiProperty({ description: 'Base64 encoded photo data', type: [String] })
//   @IsArray()
//   @IsOptional()
//   photos?: string[];

//   @ApiProperty({
//     description: 'Base64 encoded screenshot data',
//     type: [String],
//   })
//   @IsArray()
//   @IsOptional()
//   screenshots?: string[];
// }

// export class GradeSubmissionDto {
//   @ApiProperty({ description: 'ID of the test submission to grade' })
//   @IsNumber()
//   submissionId: number;

//   @ApiProperty({
//     description: 'Array of grades for each answer',
//     type: [AnswerGradeDto],
//   })
//   @IsArray()
//   grades: AnswerGradeDto[];

//   @ApiProperty({
//     description: 'Overall feedback for the submission',
//     required: false,
//   })
//   @IsString()
//   @IsOptional()
//   feedback?: string;
// }
