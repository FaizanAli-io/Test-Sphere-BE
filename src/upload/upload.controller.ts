import {
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Controller,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiTags, ApiConsumes, ApiResponse, ApiOperation } from "@nestjs/swagger";

import { UploadService } from "./upload.service";

@ApiTags("Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get("signature")
  @ApiOperation({
    summary: "Generate ImageKit upload signature",
    description:
      "Returns a short-lived signature, token, and timestamp for client-side uploads using the ImageKit SDK.",
  })
  @ApiResponse({
    status: 200,
    description: "Upload signature generated successfully.",
  })
  getSignature() {
    return this.uploadService.generateSignature();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({
    summary: "Upload a file directly to ImageKit",
    description:
      "Uploads a file directly from the backend to ImageKit. Use this when you do not want client-side uploads.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "The file to upload",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "File uploaded successfully",
    schema: {
      example: {
        fileId: "6720f1babc123...",
        name: "photo.jpg",
        url: "https://ik.imagekit.io/your_id/uploads/photo.jpg",
        height: 800,
        width: 800,
      },
    },
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadFromServer(file.buffer, file.originalname);
    return result;
  }
}
