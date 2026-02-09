import {
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Controller,
  ParseIntPipe,
} from "@nestjs/common";

import {
  ApiBody,
  ApiTags,
  ApiParam,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { UserRole, ClassTeacherRole } from "../typeorm/entities";
import { ProctoringLogService } from "./procotoring-log.service";
import { CreateProctoringLogDto, CreateProctoringLogBatchDto } from "./procotoring-log.dto";

import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UserRoleGuard } from "../common/guards/user-role.guard";
import { ClassRoleGuard } from "../common/guards/class-role.guard";

import { GetUser } from "../common/decorators/get-user.decorator";
import { RequireUserRole } from "../common/decorators/user-roles.decorator";
import { RequireClassRole } from "../common/decorators/class-roles.decorator";

@ApiBearerAuth()
@ApiTags("Proctoring Logs")
@Controller("proctoring-logs")
@UseGuards(JwtAuthGuard, UserRoleGuard, ClassRoleGuard)
export class ProctoringLogController {
  constructor(private readonly logService: ProctoringLogService) {}

  @Post()
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Add proctoring log (Student only)" })
  @ApiResponse({ status: 201, description: "Proctoring log added" })
  @ApiBody({ type: CreateProctoringLogDto })
  async addLog(@Body() dto: CreateProctoringLogDto, @GetUser("id") studentId: number) {
    return this.logService.addLog(dto, studentId);
  }

  @Post("batch")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Add multiple proctoring logs (Student only)" })
  @ApiResponse({ status: 201, description: "Proctoring logs added" })
  @ApiBody({ type: CreateProctoringLogBatchDto })
  async addLogs(@Body() dto: CreateProctoringLogBatchDto, @GetUser("id") studentId: number) {
    return this.logService.addLogs(dto.logs, studentId);
  }

  @Get(":submissionId")
  @RequireClassRole(ClassTeacherRole.VIEWER, "submission")
  @ApiOperation({
    summary: "Retrieve proctoring logs for a submission (Viewer only)",
  })
  @ApiResponse({ status: 200, description: "Logs retrieved successfully" })
  @ApiParam({ name: "submissionId", type: Number })
  async getLogs(@Param("submissionId", ParseIntPipe) submissionId: number) {
    return this.logService.getLogs(submissionId);
  }

  @Delete(":submissionId")
  @RequireClassRole(ClassTeacherRole.OWNER, "submission")
  @ApiOperation({
    summary: "Clear all proctoring logs for a submission (Owner only)",
  })
  @ApiResponse({
    status: 200,
    description: "Proctoring logs cleared successfully",
  })
  @ApiParam({ name: "submissionId", type: Number })
  async clearLogs(@Param("submissionId", ParseIntPipe) submissionId: number) {
    return this.logService.clearLogsForSubmission(submissionId);
  }
}
