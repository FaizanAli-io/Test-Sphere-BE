import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DownloadService } from './download.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('Download')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('download')
export class DownloadController {
  constructor(private readonly downloadService: DownloadService) {}

  @Get('test-results/:testId')
  @ApiOperation({ summary: 'Download test results as Excel file' })
  @ApiResponse({
    status: 200,
    description: 'Excel file downloaded successfully.',
  })
  @ApiResponse({ status: 403, description: 'Only test creator can download.' })
  async downloadTestResults(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Res() res: Response,
  ) {
    return this.downloadService.downloadTestResults(userId, testId, res);
  }

  @Get('all-logs/:testId')
  @ApiOperation({ summary: 'Download activity logs as Excel file' })
  @ApiResponse({
    status: 200,
    description: 'Excel file downloaded successfully.',
  })
  @ApiResponse({ status: 403, description: 'Only test creator can download.' })
  async downloadAllLogs(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Res() res: Response,
  ) {
    return this.downloadService.downloadAllLogs(userId, testId, res);
  }

  @Get('all-pictures/:testId')
  @ApiOperation({ summary: 'Download test photos as ZIP file' })
  @ApiResponse({
    status: 200,
    description: 'ZIP file downloaded successfully.',
  })
  @ApiResponse({ status: 403, description: 'Only test creator can download.' })
  async downloadAllPictures(
    @User('id') userId: number,
    @Param('testId', ParseIntPipe) testId: number,
    @Res() res: Response,
  ) {
    return this.downloadService.downloadAllPictures(userId, testId, res);
  }
}
