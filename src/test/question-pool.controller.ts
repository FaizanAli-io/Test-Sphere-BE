import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { TestService } from "./test.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../typeorm/entities";
import { GetUser } from "../common/decorators/get-user.decorator";
import {
  CreateQuestionPoolDto,
  UpdateQuestionPoolDto,
  BulkQuestionPoolUpdateDto,
} from "./test.dto";

@ApiTags("Question Pools")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("tests")
export class QuestionPoolController {
  constructor(private readonly testService: TestService) {}

  @Get(":testId/pools")
  @ApiOperation({ summary: "List question pools for a test" })
  @ApiResponse({ status: 200, description: "Returns question pools for a test" })
  async getPoolsByTest(@Param("testId", ParseIntPipe) testId: number) {
    return this.testService.getQuestionPoolsByTestId(testId);
  }

  @Post(":testId/pools")
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "Create a question pool (Teacher only)" })
  @ApiResponse({ status: 201, description: "Question pool created successfully" })
  async createPool(
    @Param("testId", ParseIntPipe) testId: number,
    @Body() dto: CreateQuestionPoolDto,
    @GetUser("id") userId: number,
  ) {
    return this.testService.createQuestionPool(testId, dto, userId);
  }

  @Post("pools/:id/questions")
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "Bulk add questions to a pool (Teacher only)" })
  @ApiResponse({ status: 200, description: "Questions added to pool successfully" })
  async addQuestionsToPool(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: BulkQuestionPoolUpdateDto,
    @GetUser("id") userId: number,
  ) {
    return this.testService.addQuestionsToPool(id, dto.questionIds, userId);
  }

  @Delete("pools/:id/questions")
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "Bulk remove questions from a pool (Teacher only)" })
  @ApiResponse({ status: 200, description: "Questions removed from pool successfully" })
  async removeQuestionsFromPool(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: BulkQuestionPoolUpdateDto,
    @GetUser("id") userId: number,
  ) {
    return this.testService.removeQuestionsFromPool(id, dto.questionIds, userId);
  }

  @Patch("pools/:id")
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "Update a question pool (Teacher only)" })
  @ApiResponse({ status: 200, description: "Question pool updated successfully" })
  async updatePool(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionPoolDto,
    @GetUser("id") userId: number,
  ) {
    return this.testService.updateQuestionPool(id, dto, userId);
  }

  @Delete("pools/:id")
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: "Delete a question pool (Teacher only)" })
  @ApiResponse({ status: 200, description: "Question pool deleted successfully" })
  async deletePool(@Param("id", ParseIntPipe) id: number, @GetUser("id") userId: number) {
    return this.testService.deleteQuestionPool(id, userId);
  }
}
