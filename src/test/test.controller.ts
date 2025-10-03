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
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TestService } from './test.service';
import { User } from '../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTestDto, EditTestDto, AddQuestionsDto } from './dto/test.dto';

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

  @Get('class/:classId')
  @ApiOperation({ summary: 'Get tests by class ID with questions' })
  @ApiResponse({ status: 200, description: 'Tests retrieved successfully.' })
  @ApiResponse({ status: 403, description: 'No access to this class.' })
  async getTestsByClass(
    @User('id') userId: number,
    @Param('classId', ParseIntPipe) classId: number,
  ) {
    return this.testService.getTestsByClass(userId, classId);
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

  @Patch(':id')
  @ApiOperation({ summary: 'Edit test and questions' })
  @ApiResponse({ status: 200, description: 'Test updated successfully.' })
  @ApiResponse({ status: 403, description: 'Only test creator can edit.' })
  async editTest(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
    @Body() editTestDto: EditTestDto,
  ) {
    return this.testService.editTest(userId, testId, editTestDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete test and questions' })
  @ApiResponse({ status: 200, description: 'Test deleted successfully.' })
  @ApiResponse({ status: 403, description: 'Only test creator can delete.' })
  async deleteTest(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.deleteTest(userId, testId);
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

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get test questions for students' })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully.',
  })
  @ApiResponse({ status: 403, description: 'No access to this test.' })
  async getTestQuestions(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) testId: number,
  ) {
    return this.testService.getTestQuestions(userId, testId);
  }
}
