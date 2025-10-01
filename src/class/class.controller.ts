import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClassService } from './class.service';
import { CreateClassDto, JoinClassDto, UpdateClassDto } from './dto/class.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Only teachers can create classes.',
  })
  async createClass(
    @User('id') userId: number,
    @Body() createClassDto: CreateClassDto,
  ) {
    return this.classService.createClass(userId, createClassDto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a class using class code' })
  @ApiResponse({ status: 200, description: 'Successfully joined the class.' })
  @ApiResponse({ status: 403, description: 'Only students can join classes.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async joinClass(
    @User('id') userId: number,
    @Body() joinClassDto: JoinClassDto,
  ) {
    return this.classService.joinClass(userId, joinClassDto.classCode);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns all classes for the user.',
  })
  async getUserClasses(
    @User('id') userId: number,
    @User('role') userRole: UserRole,
  ) {
    return this.classService.getUserClasses(userId, userRole);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific class by ID' })
  @ApiResponse({ status: 200, description: 'Returns the class details.' })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async getClassById(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) classId: number,
  ) {
    return this.classService.getClassById(userId, classId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class' })
  @ApiResponse({ status: 200, description: 'Class updated successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Only the teacher can update the class.',
  })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async updateClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) classId: number,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classService.updateClass(userId, classId, updateClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a class' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Only the teacher can delete the class.',
  })
  @ApiResponse({ status: 404, description: 'Class not found.' })
  async deleteClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) classId: number,
  ) {
    await this.classService.deleteClass(userId, classId);
    return { message: 'Class deleted successfully' };
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a class as a student' })
  @ApiResponse({ status: 200, description: 'Successfully left the class.' })
  @ApiResponse({
    status: 403,
    description: 'Only students can leave classes.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found or student not enrolled.',
  })
  async leaveClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) classId: number,
  ) {
    return this.classService.leaveClass(userId, classId);
  }
}

@ApiTags('Enrollment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class EnrollmentController {
  constructor(private readonly classService: ClassService) {}

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll in a class using class code' })
  @ApiResponse({
    status: 201,
    description: 'Successfully enrolled in class',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        class: {
          type: 'object',
          properties: {
            classId: { type: 'number' },
            className: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Class code is required' })
  @ApiResponse({
    status: 403,
    description: 'Only students can enroll in classes',
  })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({ status: 409, description: 'Already enrolled in this class' })
  async enrollInClass(
    @User('id') userId: number,
    @Body() body: { classCode: string },
  ) {
    return this.classService.enrollInClass(userId, body.classCode);
  }

  @Get('classes')
  @ApiOperation({ summary: 'Get student enrolled classes' })
  @ApiResponse({
    status: 200,
    description: 'Enrolled classes retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          classId: { type: 'number' },
          className: { type: 'string' },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Only students can view enrolled classes',
  })
  async getEnrolledClasses(@User('id') userId: number) {
    return this.classService.getEnrolledClasses(userId);
  }

  @Post('leave-class')
  @ApiOperation({ summary: 'Leave a class' })
  @ApiResponse({ status: 200, description: 'Successfully left the class' })
  @ApiResponse({ status: 400, description: 'Class ID is required' })
  @ApiResponse({ status: 403, description: 'Only students can leave classes' })
  @ApiResponse({ status: 404, description: 'Class not found or not enrolled' })
  async leaveClassByBody(
    @User('id') userId: number,
    @Body() body: { classId: number },
  ) {
    if (!body.classId) {
      throw new BadRequestException('Class ID is required to leave the class');
    }
    return this.classService.leaveClass(userId, body.classId);
  }
}
