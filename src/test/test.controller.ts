import {
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
} from './test.dto';
import { UserRole } from '@prisma/client';
import { TestService } from './test.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Tests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new test (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Test created successfully' })
  async createTest(@Body() dto: CreateTestDto, @GetUser('id') userId: number) {
    return this.testService.createTest(dto, userId);
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
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Test updated successfully' })
  async updateTest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTestDto,
    @GetUser('id') userId: number,
  ) {
    return this.testService.updateTest(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Test deleted successfully' })
  async deleteTest(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.testService.deleteTest(id, userId);
  }

  @Get(':testId/students')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all students giving the test' })
  @ApiResponse({ status: 200, description: 'Students giving the test' })
  async getStudentsByTest(
    @Param('testId', ParseIntPipe) testId: number,
    @GetUser('id') userId: number,
  ) {
    return this.testService.getStudentsByTestId(testId, userId);
  }

  @Get(':testId/questions')
  @ApiOperation({ summary: 'Get all questions for a test' })
  @ApiResponse({ status: 200, description: 'Returns questions for a test' })
  async getQuestionsByTest(@Param('testId', ParseIntPipe) testId: number) {
    return this.testService.getQuestionsByTestId(testId);
  }

  @Post(':testId/questions')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Add questions to a test (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Questions added successfully' })
  async addQuestions(
    @Param('testId', ParseIntPipe) testId: number,
    @Body() dto: AddQuestionsDto,
    @GetUser('id') userId: number,
  ) {
    return this.testService.addQuestions(testId, dto, userId);
  }

  @Patch('questions/:questionId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update a question in a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  async updateQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
    @GetUser('id') userId: number,
  ) {
    return this.testService.updateQuestion(questionId, dto, userId);
  }

  @Delete('questions/:questionId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove a question from a test (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Question deleted successfully' })
  async removeQuestion(
    @Param('questionId', ParseIntPipe) questionId: number,
    @GetUser('id') userId: number,
  ) {
    return this.testService.removeQuestion(questionId, userId);
  }
}
