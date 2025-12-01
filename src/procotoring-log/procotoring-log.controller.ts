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
import { UserRole } from "@prisma/client";

import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { GetUser } from "../common/decorators/get-user.decorator";
import { CreateProctoringLogDto, CreateProctoringLogBatchDto } from "./procotoring-log.dto";
import { ProctoringLogService } from "./procotoring-log.service";

@ApiTags("Proctoring Logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("proctoring-logs")
export class ProctoringLogController {
  constructor(private readonly logService: ProctoringLogService) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: "Add proctoring log (Student only)" })
  @ApiResponse({ status: 201, description: "Proctoring log added" })
  @ApiBody({ type: CreateProctoringLogDto })
  async addLog(@Body() dto: CreateProctoringLogDto, @GetUser("id") studentId: number) {
    return this.logService.addLog(dto, studentId);
  }

  @Post("batch")
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: "Add multiple proctoring logs (Student only)" })
  @ApiResponse({ status: 201, description: "Proctoring logs added" })
  @ApiBody({ type: CreateProctoringLogBatchDto })
  async addLogs(@Body() dto: CreateProctoringLogBatchDto, @GetUser("id") studentId: number) {
    return this.logService.addLogs(dto.logs, studentId);
  }

  @Get(":submissionId")
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: "Retrieve proctoring logs for a submission (Teacher only)",
  })
  @ApiResponse({ status: 200, description: "Logs retrieved successfully" })
  @ApiParam({ name: "submissionId", type: Number })
  async getLogs(
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @GetUser("id") teacherId: number,
  ) {
    return this.logService.getLogs(submissionId, teacherId);
  }

  @Delete(":submissionId")
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary: "Clear all proctoring logs for a submission (Teacher only)",
  })
  @ApiResponse({
    status: 200,
    description: "Proctoring logs cleared successfully",
  })
  @ApiParam({ name: "submissionId", type: Number })
  async clearLogs(
    @Param("submissionId", ParseIntPipe) submissionId: number,
    @GetUser("id") teacherId: number,
  ) {
    return this.logService.clearLogsForSubmission(submissionId, teacherId);
  }
}
