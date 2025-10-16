import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateProctoringLogDto } from './procotoring-log.dto';
import { ProctoringLogService } from './procotoring-log.service';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Proctoring Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('proctoring-logs')
export class ProctoringLogController {
  constructor(private readonly logService: ProctoringLogService) {}

  teacherOnlyCheck(role: UserRole) {
    if (role !== UserRole.TEACHER) {
      throw new ForbiddenException('Only teachers can perform this action');
    }
  }

  @Post()
  @ApiOperation({ summary: 'Add or update a proctoring log (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Proctoring log added or updated' })
  @ApiBody({ type: CreateProctoringLogDto })
  async addLog(
    @Body() dto: CreateProctoringLogDto,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    this.teacherOnlyCheck(role);
    return this.logService.addLog(dto, teacherId);
  }

  @Get(':submissionId')
  @ApiOperation({
    summary: 'Retrieve proctoring logs for a submission (Teacher only)',
  })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiParam({ name: 'submissionId', type: Number })
  async getLogs(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    this.teacherOnlyCheck(role);
    return this.logService.getLogs(submissionId, teacherId);
  }

  @Delete(':submissionId')
  @ApiOperation({
    summary: 'Clear all proctoring logs for a submission (Teacher only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Proctoring logs cleared successfully',
  })
  @ApiParam({ name: 'submissionId', type: Number })
  async clearLogs(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @GetUser('id') teacherId: number,
    @GetUser('role') role: UserRole,
  ) {
    this.teacherOnlyCheck(role);
    return this.logService.clearLogsForSubmission(submissionId, teacherId);
  }
}
