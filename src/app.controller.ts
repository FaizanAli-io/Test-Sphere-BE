import { Body, Controller, Get, Header, HttpCode, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AppService } from './app.service';

export class DeployRequestDto {
  @ApiProperty({ example: 'your-deploy-password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

@ApiTags('Health', 'Deploy')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('deploy')
  @HttpCode(200)
  @ApiOperation({ summary: 'Pull the latest code from origin/main' })
  @ApiBody({ type: DeployRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Deployment pull completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'OK' },
        message: { type: 'string', example: 'Deployment pull completed successfully.' },
        output: { type: 'string', example: 'Already up to date.' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid deploy password',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid deploy password.' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Deployment pull failed',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Deployment pull failed.' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async deploy(@Body() body: DeployRequestDto) {
    return this.appService.deploy(body.password);
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
