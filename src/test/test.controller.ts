import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Controller,
  ParseIntPipe,
  ParseEnumPipe,
} from "@nestjs/common";

import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
  UpdateTestConfigDto,
  CreateQuestionPoolDto,
  UpdateQuestionPoolDto,
  BulkQuestionPoolUpdateDto,
} from "./test.dto";

import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";

import { TestMode } from "./test-mode.enum";
import { TestService } from "./test.service";
import { TestAnalyticsService } from "./test-analytics.service";
import { UserRole, ClassTeacherRole } from "../typeorm/entities";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { GetUser } from "../common/decorators/get-user.decorator";
import { ClassRoleGuard } from "../common/guards/class-role.guard";
import { RequireClassRole } from "../common/decorators/class-roles.decorator";

@ApiBearerAuth()
@ApiTags("Tests")
@Controller("tests")
@UseGuards(JwtAuthGuard, ClassRoleGuard)
export class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly testAnalyticsService: TestAnalyticsService,
  ) {}

  @Post()
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Create a new test (Editor only)" })
  @ApiResponse({ status: 201, description: "Test created successfully" })
  async createTest(@Body() dto: CreateTestDto) {
    return this.testService.createTest(dto);
  }

  @Get(":testId")
  @ApiOperation({ summary: "Get a test by ID" })
  @ApiResponse({ status: 200, description: "Returns test details" })
  async getTestById(@Param("testId", ParseIntPipe) testId: number) {
    return this.testService.getTestById(testId);
  }

  @Get("class/:classId")
  @ApiOperation({ summary: "Get all tests for a class" })
  @ApiResponse({ status: 200, description: "Returns all tests for a given class" })
  async getTestsByClassId(@Param("classId", ParseIntPipe) classId: number) {
    return this.testService.getTestsByClassId(classId);
  }

  @Patch(":testId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "test")
  @ApiOperation({ summary: "Update a test (Editor only)" })
  @ApiResponse({ status: 200, description: "Test updated successfully" })
  async updateTest(@Param("testId", ParseIntPipe) testId: number, @Body() dto: UpdateTestDto) {
    return this.testService.updateTest(testId, dto);
  }

  @Patch(":testId/config")
  @RequireClassRole(ClassTeacherRole.EDITOR, "test")
  @ApiOperation({ summary: "Update a test configuration (Editor only)" })
  @ApiResponse({ status: 200, description: "Configuration updated successfully" })
  async updateTestConfig(
    @Param("testId", ParseIntPipe) testId: number,
    @Body() dto: UpdateTestConfigDto,
  ) {
    return this.testService.updateTestConfig(testId, dto);
  }

  @Delete(":testId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "test")
  @ApiOperation({ summary: "Delete a test (Editor only)" })
  @ApiResponse({ status: 200, description: "Test deleted successfully" })
  async deleteTest(@Param("testId", ParseIntPipe) testId: number) {
    return this.testService.deleteTest(testId);
  }

  @Get(":testId/invigilate")
  @RequireClassRole(ClassTeacherRole.VIEWER, "test")
  @ApiOperation({ summary: "Get all students giving the test" })
  @ApiResponse({ status: 200, description: "Students giving the test" })
  async getStudentsByTest(@Param("testId", ParseIntPipe) testId: number) {
    return this.testService.getStudentsByTestId(testId);
  }

  @Get(":testId/analytics")
  @RequireClassRole(ClassTeacherRole.VIEWER, "test")
  @ApiOperation({ summary: "Get analytics summary for a test (Viewer+)" })
  @ApiResponse({ status: 200, description: "Test analytics data" })
  async getTestAnalytics(@Param("testId", ParseIntPipe) testId: number) {
    return this.testAnalyticsService.getTestAnalytics(testId);
  }
}

@ApiBearerAuth()
@ApiTags("Questions")
@Controller("tests")
@UseGuards(JwtAuthGuard, ClassRoleGuard)
export class QuestionController {
  constructor(private readonly testService: TestService) {}

  @Get(":testId/questions")
  @ApiOperation({ summary: "Get all questions for a test" })
  @ApiQuery({ name: "mode", required: false, enum: TestMode })
  @ApiResponse({ status: 200, description: "Returns questions for a test" })
  async getQuestionsByTest(
    @Param("testId", ParseIntPipe) testId: number,
    @GetUser("role") userRole: UserRole,
    @Query("mode", new ParseEnumPipe(TestMode)) mode?: TestMode,
  ) {
    return this.testService.getQuestionsByTestId(testId, userRole, mode);
  }

  @Post(":testId/questions")
  @RequireClassRole(ClassTeacherRole.EDITOR, "test")
  @ApiOperation({ summary: "Add questions to a test (Editor only)" })
  @ApiResponse({ status: 201, description: "Questions added successfully" })
  async addQuestions(@Param("testId", ParseIntPipe) testId: number, @Body() dto: AddQuestionsDto) {
    return this.testService.addQuestions(testId, dto);
  }

  @Patch("questions/:questionId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "question")
  @ApiOperation({ summary: "Update a question in a test (Editor only)" })
  @ApiResponse({ status: 200, description: "Question updated successfully" })
  async updateQuestion(
    @Param("questionId", ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.testService.updateQuestion(questionId, dto);
  }

  @Delete("questions/:questionId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "question")
  @ApiOperation({ summary: "Remove a question from a test (Editor only)" })
  @ApiResponse({ status: 200, description: "Question deleted successfully" })
  async removeQuestion(@Param("questionId", ParseIntPipe) questionId: number) {
    return this.testService.removeQuestion(questionId);
  }
}

@ApiBearerAuth()
@ApiTags("Question Pools")
@Controller("tests")
@UseGuards(JwtAuthGuard, ClassRoleGuard)
export class QuestionPoolController {
  constructor(private readonly testService: TestService) {}

  @Get(":testId/pools")
  @RequireClassRole(ClassTeacherRole.VIEWER, "test")
  @ApiOperation({ summary: "List question pools for a test" })
  @ApiResponse({ status: 200, description: "Returns question pools for a test" })
  async getPoolsByTest(@Param("testId", ParseIntPipe) testId: number) {
    return this.testService.getQuestionPoolsByTestId(testId);
  }

  @Post(":testId/pools")
  @RequireClassRole(ClassTeacherRole.EDITOR, "test")
  @ApiOperation({ summary: "Create a question pool (Editor only)" })
  @ApiResponse({ status: 201, description: "Question pool created successfully" })
  async createPool(
    @Param("testId", ParseIntPipe) testId: number,
    @Body() dto: CreateQuestionPoolDto,
  ) {
    return this.testService.createQuestionPool(testId, dto);
  }

  @Post("pools/:poolId/questions")
  @RequireClassRole(ClassTeacherRole.EDITOR, "questionPool")
  @ApiOperation({ summary: "Bulk add questions to a pool (Editor only)" })
  @ApiResponse({ status: 200, description: "Questions added to pool successfully" })
  async addQuestionsToPool(
    @Param("poolId", ParseIntPipe) poolId: number,
    @Body() dto: BulkQuestionPoolUpdateDto,
  ) {
    return this.testService.addQuestionsToPool(poolId, dto.questionIds);
  }

  @Delete("pools/:poolId/questions")
  @RequireClassRole(ClassTeacherRole.EDITOR, "questionPool")
  @ApiOperation({ summary: "Bulk remove questions from a pool (Editor only)" })
  @ApiResponse({ status: 200, description: "Questions removed from pool successfully" })
  async removeQuestionsFromPool(
    @Param("poolId", ParseIntPipe) poolId: number,
    @Body() dto: BulkQuestionPoolUpdateDto,
  ) {
    return this.testService.removeQuestionsFromPool(poolId, dto.questionIds);
  }

  @Patch("pools/:poolId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "questionPool")
  @ApiOperation({ summary: "Update a question pool (Editor only)" })
  @ApiResponse({ status: 200, description: "Question pool updated successfully" })
  async updatePool(
    @Param("poolId", ParseIntPipe) poolId: number,
    @Body() dto: UpdateQuestionPoolDto,
  ) {
    return this.testService.updateQuestionPool(poolId, dto);
  }

  @Delete("pools/:poolId")
  @RequireClassRole(ClassTeacherRole.EDITOR, "questionPool")
  @ApiOperation({ summary: "Delete a question pool (Editor only)" })
  @ApiResponse({ status: 200, description: "Question pool deleted successfully" })
  async deletePool(@Param("poolId", ParseIntPipe) poolId: number) {
    return this.testService.deleteQuestionPool(poolId);
  }
}
