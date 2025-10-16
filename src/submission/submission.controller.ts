import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

import {
  SubmitTestDto,
  StartSubmissionDto,
  GradeSubmissionDto,
  UpdateSubmissionStatusDto,
} from './submission.dto';
import { UserRole } from '@prisma/client';
import { SubmissionService } from './submission.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiBearerAuth()
@ApiTags('Submissions')
@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post('start')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start a test (Student only)' })
  @ApiResponse({ status: 201, description: 'Submission started successfully' })
  async startTest(
    @Body() dto: StartSubmissionDto,
    @GetUser('id') userId: number,
  ) {
    return this.submissionService.startTest(userId, dto);
  }

  @Post('submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit test answers (Student only)' })
  @ApiResponse({ status: 200, description: 'Test submitted successfully' })
  async submitTest(@Body() dto: SubmitTestDto, @GetUser('id') userId: number) {
    return this.submissionService.submitTest(userId, dto);
  }

  @Post(':id/grade')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Grade a student submission (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  async gradeSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() dto: GradeSubmissionDto,
    @GetUser('id') teacherId: number,
  ) {
    return this.submissionService.gradeSubmission(teacherId, submissionId, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update submission status (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission status updated' })
  async updateStatus(
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() dto: UpdateSubmissionStatusDto,
    @GetUser('id') teacherId: number,
  ) {
    return this.submissionService.updateSubmissionStatus(
      teacherId,
      submissionId,
      dto.status,
    );
  }

  @Get('test/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all submissions for a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'List of submissions returned' })
  async getSubmissionsForTest(
    @Param('id', ParseIntPipe) testId: number,
    @GetUser('id') teacherId: number,
  ) {
    return this.submissionService.getSubmissionsForTest(teacherId, testId);
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all submissions for a student (Student only)' })
  @ApiResponse({
    status: 200,
    description: 'List of student submissions returned',
  })
  async getMySubmissions(@GetUser('id') userId: number) {
    return this.submissionService.getSubmissionsByStudent(userId);
  }

  @Get(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get a single submission by ID (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission details returned' })
  async getSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @GetUser('id') teacherId: number,
  ) {
    return this.submissionService.getSubmission(teacherId, submissionId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a submission (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Submission deleted successfully' })
  async deleteSubmission(
    @Param('id', ParseIntPipe) submissionId: number,
    @GetUser('id') teacherId: number,
  ) {
    return this.submissionService.deleteSubmission(teacherId, submissionId);
  }
}
