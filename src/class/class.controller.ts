import {
  Post,
  Get,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

import {
  JoinClassDto,
  CreateClassDto,
  UpdateClassDto,
  ManageStudentDto,
} from './class.dto';
import { UserRole } from '@prisma/client';
import { ClassService } from './class.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new class (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Class created successfully' })
  async createClass(
    @Body() dto: CreateClassDto,
    @GetUser('id') userId: number,
  ) {
    return this.classService.createClass(dto, userId);
  }

  @Post('join')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Join a class (Student only)' })
  @ApiResponse({ status: 200, description: 'Successfully joined class' })
  async joinClass(@Body() dto: JoinClassDto, @GetUser('id') userId: number) {
    return this.classService.joinClass(dto, userId);
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
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update class details (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Class updated successfully' })
  async updateClass(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
    @GetUser('id') userId: number,
  ) {
    return this.classService.updateClass(id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete class (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Class deleted successfully' })
  async deleteClass(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ) {
    return this.classService.deleteClass(id, userId);
  }

  @Post(':id/leave')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Leave a class (Student only)' })
  @ApiResponse({ status: 200, description: 'Left class successfully' })
  async leaveClass(
    @Param('id', ParseIntPipe) classId: number,
    @GetUser('id') userId: number,
  ) {
    return this.classService.leaveClass(classId, userId);
  }

  @Post(':id/remove')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Remove a student from class (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Student removed from class' })
  async removeStudent(
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: ManageStudentDto,
    @GetUser('id') userId: number,
  ) {
    return this.classService.removeStudent(classId, dto, userId);
  }

  @Post(':id/approve')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Approve student join request (Teacher only)' })
  @ApiResponse({ status: 200, description: 'Student approved successfully' })
  async approveStudent(
    @Param('id', ParseIntPipe) classId: number,
    @Body() dto: ManageStudentDto,
    @GetUser('id') userId: number,
  ) {
    return this.classService.approveStudent(classId, dto, userId);
  }
}
