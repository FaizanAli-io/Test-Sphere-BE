import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { OtherService } from './other.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  SubmitTestDto,
  SubmitQuestionsDto,
  GradeSubmissionDto,
  SubmitTestPhotosDto,
} from './dto/other.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('Tests - Other')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestController {
  constructor(private readonly testService: OtherService) {}

  @Post(':id/start')
  @ApiOperation({ summary: 'Start taking a test' })
  @ApiResponse({ status: 200, description: 'Test started successfully.' })
  @ApiResponse({ status: 403, description: 'No access to this test.' })
  async startTest(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.startTest(userId, { testId });
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit test answers' })
  @ApiResponse({ status: 200, description: 'Test submitted successfully.' })
  @ApiResponse({ status: 403, description: 'Not your test submission.' })
  async submitTest(
    @User('id') userId: number,
    @Body() submitDto: SubmitTestDto,
  ) {
    return this.testService.submitTest(userId, submitDto);
  }

  @Post('submit/photos')
  @ApiOperation({ summary: 'Submit test photos' })
  @ApiResponse({ status: 200, description: 'Photos submitted successfully.' })
  @ApiResponse({ status: 403, description: 'Not your test submission.' })
  async submitPhotos(
    @User('id') userId: number,
    @Body() photoDto: SubmitTestPhotosDto,
  ) {
    return this.testService.submitPhotos(userId, photoDto);
  }

  @Post(':id/grade')
  @ApiOperation({ summary: 'Grade a test submission' })
  @ApiResponse({ status: 200, description: 'Test graded successfully.' })
  @ApiResponse({
    status: 403,
    description: 'No permission to grade this test.',
  })
  async gradeSubmission(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) submissionId: number,
    @Body() gradeDto: GradeSubmissionDto,
  ) {
    return this.testService.gradeSubmission(userId, {
      ...gradeDto,
      submissionId,
    });
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a file (PDF/Excel) to create test questions',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    // File processing will be implemented in the next step
    return { filename: file.filename };
  }

  @Post('submit-questions')
  @ApiOperation({ summary: 'Bulk insert questions' })
  @ApiResponse({
    status: 200,
    description: 'Questions submitted successfully.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only teachers can submit questions.',
  })
  async submitQuestions(
    @User('id') userId: number,
    @Body() submitQuestionsDto: SubmitQuestionsDto,
  ) {
    return this.testService.submitQuestions(userId, submitQuestionsDto);
  }

  @Post(':id/logs')
  @ApiOperation({ summary: 'Submit activity logs during test' })
  @ApiResponse({ status: 200, description: 'Logs submitted successfully.' })
  @ApiResponse({ status: 403, description: 'No access to this test.' })
  async submitTestLogs(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() logsData: any,
  ) {
    return this.testService.submitTestLogs(userId, testId, logsData);
  }

  @Get(':testId/logs/:studentId')
  @ApiOperation({ summary: 'Get student activity logs for a test' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'Only test creator can view logs.' })
  async getTestLogs(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.testService.getTestLogs(userId, testId, studentId);
  }

  @Post(':id/check-submission')
  @ApiOperation({ summary: 'Check if student has submitted test' })
  @ApiResponse({ status: 200, description: 'Submission status retrieved.' })
  @ApiResponse({ status: 403, description: 'No access to this test.' })
  async checkTestSubmission(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.checkTestSubmission(userId, testId);
  }

  @Get(':id/result')
  @ApiOperation({ summary: 'Get test result and marks' })
  @ApiResponse({ status: 200, description: 'Result retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'No access to this test.' })
  async getTestResult(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.getTestResult(userId, testId);
  }

  @Get(':id/duration')
  @ApiOperation({ summary: 'Get test duration' })
  @ApiResponse({ status: 200, description: 'Duration retrieved successfully.' })
  async getTestDuration(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.getTestDuration(userId, testId);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'Submit test answers' })
  @ApiResponse({ status: 200, description: 'Answers submitted successfully.' })
  async submitTestAnswers(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() data: { studentId: number; answers: any[]; classId: number },
  ) {
    return this.testService.submitTestAnswers(userId, testId, data);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Submit test photos' })
  @ApiResponse({ status: 200, description: 'Photos submitted successfully.' })
  async submitTestPhotos(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() data: { studentId: number; photos: any[]; classId: number },
  ) {
    return this.testService.submitTestPhotos(userId, testId, data);
  }

  @Post(':id/screenshots')
  @ApiOperation({ summary: 'Submit test screenshots' })
  @ApiResponse({
    status: 200,
    description: 'Screenshots submitted successfully.',
  })
  async submitTestScreenshots(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() data: { studentId: number; screenshots: any[]; classId: number },
  ) {
    return this.testService.submitTestScreenshots(userId, testId, data);
  }

  @Get(':testId/media/:studentId')
  @ApiOperation({ summary: 'Get test media' })
  @ApiResponse({ status: 200, description: 'Media retrieved successfully.' })
  async getTestMedia(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.testService.getTestMedia(userId, testId, studentId);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Get test results' })
  @ApiResponse({ status: 200, description: 'Results retrieved successfully.' })
  async getTestResults(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.getTestResults(userId, testId);
  }

  @Post('mark-answer')
  @ApiOperation({ summary: 'Mark individual answer' })
  @ApiResponse({ status: 200, description: 'Answer marked successfully.' })
  @ApiResponse({ status: 403, description: 'Only test creator can mark.' })
  async markAnswer(
    @User('id') userId: number,
    @Body()
    markData: {
      testId: number;
      studentId: number;
      questionId: number;
      obtainedMarks: number;
      totalMarks: number;
    },
  ) {
    return this.testService.markAnswer(userId, markData);
  }

  @Delete(':testId/unsubmit')
  @ApiOperation({ summary: 'Unsubmit test' })
  @ApiResponse({ status: 200, description: 'Test unsubmitted successfully.' })
  async unsubmitTest(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Body() data: { studentId: number; classId: number },
  ) {
    return this.testService.unsubmitTest(userId, testId, data);
  }
}
