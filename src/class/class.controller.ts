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
import { UserRole } from '../../generated/prisma';

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
}
