import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadService } from './upload.service';
import type {
  QuestionGenerationRequest,
  ChatbotRequest,
} from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('pdf')
  @ApiOperation({ summary: 'Upload PDF and generate questions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file and question generation parameters',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        pdf: {
          type: 'string',
          format: 'binary',
        },
        numberOfMultipleChoice: {
          type: 'number',
        },
        numberOfTrueFalse: {
          type: 'number',
        },
        numberOfShortAnswer: {
          type: 'number',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Questions generated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file format',
  })
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: QuestionGenerationRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const questionRequest: QuestionGenerationRequest = {
      numberOfMultipleChoice: parseInt(body.numberOfMultipleChoice as any) || 0,
      numberOfTrueFalse: parseInt(body.numberOfTrueFalse as any) || 0,
      numberOfShortAnswer: parseInt(body.numberOfShortAnswer as any) || 0,
    };

    const questions = await this.uploadService.processPdfFile(
      file.path,
      questionRequest,
    );

    return {
      success: true,
      questions,
    };
  }

  @Post('chatbot')
  @ApiOperation({ summary: 'Generate AI questions from topic' })
  @ApiBody({
    description: 'Topic and question type distribution',
    schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', example: 'Mathematics' },
        number: { type: 'number', example: 5 },
        types: {
          type: 'object',
          properties: {
            multipleChoice: { type: 'number', example: 2 },
            trueFalse: { type: 'number', example: 2 },
            shortAnswer: { type: 'number', example: 1 },
          },
        },
      },
      required: ['topic', 'number', 'types'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Questions generated successfully',
    schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              questionNumber: { type: 'number' },
              text: { type: 'string' },
              type: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Topic, number, and types are required',
  })
  async generateChatbotQuestions(@Body() chatbotRequest: ChatbotRequest) {
    const questions =
      await this.uploadService.generateChatbotQuestions(chatbotRequest);

    return {
      questions,
    };
  }

  @Post('questions-csv')
  @ApiOperation({ summary: 'Import questions from CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file with questions',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        csv: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Questions imported successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid CSV format',
  })
  @UseInterceptors(
    FileInterceptor('csv', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype !== 'text/csv' &&
          !file.originalname.toLowerCase().endsWith('.csv')
        ) {
          cb(new BadRequestException('Only CSV files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async uploadCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const questions = await this.uploadService.processCsvFile(file.path);

    return {
      success: true,
      questions,
    };
  }

  @Post('questions-pdf')
  @ApiOperation({ summary: 'Parse questions from PDF file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file with questions',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        pdf: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Questions parsed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answer: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid PDF format',
  })
  @UseInterceptors(
    FileInterceptor('pdf', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadQuestionsPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const questions = await this.uploadService.parseQuestionsFromPdf(file.path);

    return {
      success: true,
      questions,
    };
  }

  @Post('questions-csv')
  @ApiOperation({ summary: 'Upload CSV to extract questions' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        csv: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('csv', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(csv)$/)) {
          return cb(
            new BadRequestException('Only CSV files are allowed'),
            false,
          );
        } else {
          cb(null, true);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadQuestionsCsv(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const questions = await this.uploadService.processCsvFile(file.path);

    return {
      success: true,
      questions,
    };
  }
}
