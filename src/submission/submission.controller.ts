import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import {
  SubmitTestDto,
  StartSubmissionDto,
  GradeSubmissionDto,
} from './submission.dto';
import { SubmissionService } from './submission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a test (Student only)' })
  @ApiResponse({ status: 201, description: 'Submission started successfully' })
  async startTest(
    @Body() dto: StartSubmissionDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.STUDENT)
      throw new Error('Only students can start a test');
    return this.submissionService.startTest(userId, dto);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit test answers (Student only)' })
  @ApiResponse({ status: 200, description: 'Test submitted successfully' })
  async submitTest(
    @Body() dto: SubmitTestDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.STUDENT)
      throw new Error('Only students can submit a test');
    return this.submissionService.submitTest(userId, dto);
  }

  @Post(':id/grade')
  @ApiOperation({ summary: 'Grade a student submission (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  async gradeSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() dto: GradeSubmissionDto,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.TEACHER)
      throw new Error('Only teachers can grade submissions');
    return this.submissionService.gradeSubmission(teacherId, submissionId, dto);
  }

  @Get('test/:id')
  @ApiOperation({ summary: 'Get all submissions for a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of submissions returned' })
  async getSubmissionsForTest(
    @Param('id', ParseIntPipe) testId: number,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.TEACHER)
      throw new Error('Only teachers can view test submissions');
    return this.submissionService.getSubmissionsForTest(teacherId, testId);
  }

  @Get('student')
  @ApiOperation({ summary: 'Get all submissions for a student (Student only)' })
  @ApiResponse({
    status: 200,
    description: 'List of student submissions returned',
  })
  async getMySubmissions(
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.STUDENT)
      throw new Error('Only students can view their own submissions');
    return this.submissionService.getSubmissionsByStudent(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single submission by ID (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission details returned' })
  async getSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    if (role !== UserRole.TEACHER)
      throw new Error('Only teachers can view submissions');
    return this.submissionService.getSubmission(teacherId, submissionId);
  }
}
