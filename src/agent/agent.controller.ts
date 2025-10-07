import type { Response } from 'express';
import { AgentService } from './agent.service';
import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AgentDto } from './agent.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Agent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('stream')
  @ApiOperation({ summary: 'Stream agent completion (authenticated)' })
  @ApiResponse({ status: 200, description: 'Stream started' })
  @ApiBody({ type: AgentDto })
  async streamResponse(@Body() body: AgentDto, @Res() res: Response) {
    await this.agentService.streamCompletion(body.prompt, res);
  }
}
