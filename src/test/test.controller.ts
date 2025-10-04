import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
} from './dto/test.dto';
import { UserRole } from '@prisma/client';
import { TestService } from './test.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new test (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Test created successfully' })
  async createTest(
    @Body() dto: CreateTestDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.createTest(dto, userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a test by ID' })
  @ApiResponse({ status: 200, description: 'Returns test details' })
  async getTestById(@Param('id', ParseIntPipe) id: number) {
    return this.testService.getTestById(id);
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Get all tests for a class' })
  @ApiResponse({
    status: 200,
    description: 'Returns all tests for a given class',
  })
  async getTestsByClassId(@Param('classId', ParseIntPipe) classId: number) {
    return this.testService.getTestsByClassId(classId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Test updated successfully' })
  async updateTest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.updateTest(id, dto, userId, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Test deleted successfully' })
  async deleteTest(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.deleteTest(id, userId, role);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get all questions for a test' })
  @ApiResponse({ status: 200, description: 'Returns questions for a test' })
  async getQuestionsByTest(@Param('id', ParseIntPipe) testId: number) {
    return this.testService.getQuestionsByTestId(testId);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add questions to a test (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async addQuestions(
    @Param('id', ParseIntPipe) testId: number,
    @Body() dto: AddQuestionsDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.addQuestions(testId, dto, userId, role);
  }

  @Patch('questions/:id')
  @ApiOperation({ summary: 'Update a question in a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.updateQuestion(id, dto, userId, role);
  }

  @Delete('questions/:id')
  @ApiOperation({ summary: 'Remove a question from a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  async removeQuestion(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.testService.removeQuestion(id, userId, role);
  }
}
