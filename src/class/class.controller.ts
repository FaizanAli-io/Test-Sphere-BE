import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import {
  CreateClassDto,
  JoinClassDto,
  UpdateClassDto,
  KickStudentDto,
} from './dto';
import { UserRole } from '@prisma/client';
import { ClassService } from './class.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  async createClass(
    @Body() dto: CreateClassDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.createClass(dto, userId, role);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a class (Student only)' })
  @ApiResponse({ status: 200, description: 'Successfully joined class' })
  async joinClass(
    @Body() dto: JoinClassDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.joinClass(dto, userId, role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes for current user' })
  @ApiResponse({ status: 200, description: 'List of user classes' })
  async getMyClasses(
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.getMyClasses(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class details by ID' })
  @ApiResponse({ status: 200, description: 'Class details returned' })
  async getClass(@Param('id', ParseIntPipe) id: number) {
    return this.classService.getClassById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update class details (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  async updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.updateClass(id, dto, userId, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete class (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  async deleteClass(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.deleteClass(id, userId, role);
  }

  @Post(':id/kick')
  @ApiOperation({ summary: 'Kick a student from class (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Student removed from class' })
  async kickStudent(
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: KickStudentDto,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.kickStudent(classId, dto, userId, role);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave a class (Student only)' })
  @ApiResponse({ status: 200, description: 'Left class successfully' })
  async leaveClass(
    @Param('id', ParseIntPipe) classId: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
  ) {
    return this.classService.leaveClass(classId, userId, role);
  }
}
