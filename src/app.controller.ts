import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/health')
  @ApiOperation({ summary: 'API and database health check' })
  @ApiResponse({
    status: 200,
    description: 'API is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        message: { type: 'string', example: 'API is healthy!' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'API is not healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ERROR' },
        message: { type: 'string', example: 'API is not healthy.' },
      },
    },
  })
  async healthCheck() {
    return this.appService.healthCheck();
  }
}
