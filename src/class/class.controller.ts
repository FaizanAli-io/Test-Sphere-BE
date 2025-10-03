import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
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
import { UserRole } from '@prisma/client';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new class (Teacher only)' })
  async createClass(@User('id') userId: number, @Body() dto: CreateClassDto) {
    return this.classService.createClass(userId, dto);
  }

  @Post('join')
  @ApiOperation({ summary: 'Join a class (Student only)' })
  async joinClass(@User('id') userId: number, @Body() dto: JoinClassDto) {
    return this.classService.joinClass(userId, dto.classCode);
  }

  @Get()
  @ApiOperation({ summary: 'Get all classes for current user' })
  async getUserClasses(
    @User('id') userId: number,
    @User('role') role: UserRole,
  ) {
    return this.classService.getUserClasses(userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get class details' })
  async getClassById(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classService.getClassById(userId, id);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get students in a class' })
  async getClassStudents(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classService.getClassStudents(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update class (Teacher only)' })
  async updateClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classService.updateClass(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete class (Teacher only)' })
  async deleteClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.classService.deleteClass(userId, id);
    return { message: 'Class deleted successfully' };
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a class (Student only)' })
  async leaveClass(
    @User('id') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.classService.leaveClass(userId, id);
  }
}
