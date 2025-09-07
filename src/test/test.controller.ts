import {
  Controller,
  Post,
  Get,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { TestService } from './test.service';
import { CreateTestDto, AddQuestionsDto } from './dto/test.dto';
import {
  StartTestDto,
  SubmitTestDto,
  SubmitTestPhotosDto,
  GradeSubmissionDto,
} from './dto/test-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new test' })
  @ApiResponse({ status: 201, description: 'Test created successfully.' })
  @ApiResponse({ status: 403, description: 'Only teachers can create tests.' })
  async createTest(
    @User('id') userId: number,
    @Body() createTestDto: CreateTestDto,
  ) {
    return this.testService.createTest(userId, createTestDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get test by ID' })
  @ApiResponse({ status: 200, description: 'Test retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Test not found.' })
  async getTest(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.getTest(userId, testId);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add questions to a test' })
  @ApiResponse({ status: 200, description: 'Questions added successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Only the test creator can add questions.',
  })
  async addQuestions(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() questionsDto: AddQuestionsDto,
  ) {
    return this.testService.addQuestions(userId, testId, questionsDto);
  }

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
}
