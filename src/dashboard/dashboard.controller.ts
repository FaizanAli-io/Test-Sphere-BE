import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Student dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        student: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' },
            id: { type: 'number' },
          },
        },
        enrolledClasses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              classId: { type: 'number' },
              className: { type: 'string' },
              classCode: { type: 'string' },
              teacherName: { type: 'string' },
            },
          },
        },
        upcomingTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              testId: { type: 'number' },
              testTitle: { type: 'string' },
              dueDate: { type: 'string', format: 'date-time' },
              className: { type: 'string' },
            },
          },
        },
        availableTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              testId: { type: 'number' },
              testTitle: { type: 'string' },
              className: { type: 'string' },
              classId: { type: 'number' },
              date: { type: 'string', format: 'date-time' },
              duration: { type: 'number' },
              disableTime: { type: 'string', format: 'date-time' },
            },
          },
        },
        recentSubmissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              testId: { type: 'number' },
              testTitle: { type: 'string' },
              submittedAt: { type: 'string', format: 'date-time' },
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied. Only students can access the dashboard.',
  })
  async getStudentDashboard(@User('id') userId: number) {
    return this.dashboardService.getStudentDashboard(userId);
  }

  @Get('teacher-dashboard')
  @ApiOperation({ summary: 'Get teacher dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Teacher dashboard data retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        teacher: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            email: { type: 'string' },
          },
        },
        classes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              classId: { type: 'number' },
              className: { type: 'string' },
              classCode: { type: 'string' },
              studentCount: { type: 'number' },
            },
          },
        },
        upcomingTests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              testId: { type: 'number' },
              title: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              className: { type: 'string' },
            },
          },
        },
        testAttempts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              testId: { type: 'number' },
              title: { type: 'string' },
              className: { type: 'string' },
              totalStudents: { type: 'number' },
              attemptedCount: { type: 'number' },
              notAttemptedCount: { type: 'number' },
              attemptPercentage: { type: 'number' },
            },
          },
        },
        statistics: {
          type: 'object',
          properties: {
            totalClasses: { type: 'number' },
            totalStudents: { type: 'number' },
            upcomingTests: { type: 'number' },
            completedTests: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied. Only teachers can access this dashboard.',
  })
  async getTeacherDashboard(@User('id') userId: number) {
    return this.dashboardService.getTeacherDashboard(userId);
  }
}
