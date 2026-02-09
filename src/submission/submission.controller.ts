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
} from "@nestjs/common";

import { ApiTags, ApiResponse, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

import {
  SubmitTestDto,
  StartSubmissionDto,
  GradeSubmissionDto,
  UpdateSubmissionStatusDto,
} from "./submission.dto";

import { ClassTeacherRole, UserRole } from "../typeorm/entities";
import { SubmissionService } from "./submission.service";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UserRoleGuard } from "../common/guards/user-role.guard";
import { ClassRoleGuard } from "../common/guards/class-role.guard";

import { GetUser } from "../common/decorators/get-user.decorator";
import { RequireUserRole } from "../common/decorators/user-roles.decorator";
import { RequireClassRole } from "../common/decorators/class-roles.decorator";

@ApiBearerAuth()
@ApiTags("Submissions")
@Controller("submissions")
@UseGuards(JwtAuthGuard, UserRoleGuard, ClassRoleGuard)
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post("start")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Start a test (Student only)" })
  @ApiResponse({ status: 201, description: "Submission started successfully" })
  async startTest(@Body() dto: StartSubmissionDto, @GetUser("id") userId: number) {
    return this.submissionService.startTest(userId, dto);
  }

  @Post("submit")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Submit test answers (Student only)" })
  @ApiResponse({ status: 200, description: "Test submitted successfully" })
  async submitTest(@Body() dto: SubmitTestDto, @GetUser("id") userId: number) {
    return this.submissionService.submitTest(userId, dto);
  }

  @Post(":submissionId/grade")
  @RequireClassRole(ClassTeacherRole.OWNER, "submission")
  @ApiOperation({ summary: "Grade a student submission (Teacher only)" })
  @ApiResponse({ status: 200, description: "Submission graded successfully" })
  async gradeSubmission(
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.submissionService.gradeSubmission(submissionId, dto);
  }

  @Patch(":submissionId/status")
  @RequireClassRole(ClassTeacherRole.OWNER, "submission")
  @ApiOperation({ summary: "Update submission status (Teacher only)" })
  @ApiResponse({ status: 200, description: "Submission status updated" })
  async updateStatus(
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @Body() dto: UpdateSubmissionStatusDto,
  ) {
    return this.submissionService.updateSubmissionStatus(submissionId, dto.status);
  }

  @Get("test/:testId")
  @RequireClassRole(ClassTeacherRole.VIEWER, "test")
  @ApiOperation({ summary: "Get all submissions for a test (Teacher only)" })
  @ApiResponse({ status: 200, description: "List of submissions returned" })
  async getSubmissionsForTest(@Param("testId", ParseIntPipe) testId: number) {
    return this.submissionService.getSubmissionsForTest(testId);
  }

  @Get("student")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Get all submissions for a student (Student only)" })
  @ApiResponse({
    status: 200,
    description: "List of student submissions returned",
  })
  async getMySubmissions(@GetUser("id") userId: number) {
    return this.submissionService.getSubmissionsByStudent(userId);
  }

  @Get(":submissionId")
  @RequireClassRole(ClassTeacherRole.VIEWER, "submission")
  @ApiOperation({ summary: "Get a single submission by ID (Teacher only)" })
  @ApiResponse({ status: 200, description: "Submission details returned" })
  async getSubmission(@Param("submissionId", ParseIntPipe) submissionId: number) {
    return this.submissionService.getSubmission(submissionId);
  }

  @Delete(":submissionId")
  @RequireClassRole(ClassTeacherRole.OWNER, "submission")
  @ApiOperation({ summary: "Delete a submission (Teacher only)" })
  @ApiResponse({ status: 200, description: "Submission deleted successfully" })
  async deleteSubmission(@Param("submissionId", ParseIntPipe) submissionId: number) {
    return this.submissionService.deleteSubmission(submissionId);
  }
}
