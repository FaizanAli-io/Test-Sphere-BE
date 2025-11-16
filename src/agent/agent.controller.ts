import type { Response } from "express";
import { AgentService } from "./agent.service";
import {
  Res,
  Post,
  Body,
  UseGuards,
  Controller,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBody,
  ApiTags,
  ApiConsumes,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AgentDto } from "./agent.dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("Agent")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("agent")
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post("stream")
  @ApiOperation({ summary: "Stream agent completion (authenticated)" })
  @ApiResponse({ status: 200, description: "Stream started" })
  @ApiBody({ type: AgentDto })
  async streamResponse(@Body() body: AgentDto, @Res() res: Response) {
    await this.agentService.streamCompletion(body.prompt, res);
  }

  @Post("generate-questions/ask")
  @ApiOperation({
    summary: "Generate structured questions from a prompt",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          example:
            "Generate 10 mixed algebra questions for grade 9, including multiple choice, true/false, short and long answer types.",
        },
      },
      required: ["prompt"],
    },
  })
  async generateQuestions(@Body("prompt") prompt: string) {
    return this.agentService.generateQuestionsFromPrompt(prompt);
  }

  @Post("generate-questions/pdf")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Generate structured questions from a PDF upload",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Questions generated from PDF" })
  async generateQuestionsFromPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded.");

    return this.agentService.generateQuestionsFromPdf(file.buffer);
  }
}
