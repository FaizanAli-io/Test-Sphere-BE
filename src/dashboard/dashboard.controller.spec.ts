import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let dashboardService: DashboardService;

  const mockDashboardService = {
    getStudentDashboard: jest.fn(),
    getTeacherDashboard: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        {
          provide: DashboardService,
          useValue: mockDashboardService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<DashboardController>(DashboardController);
    dashboardService = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStudentDashboard', () => {
    it('should return student dashboard data', async () => {
      const userId = 1;
      const expectedDashboard = {
        student: {
          name: 'John Doe',
          email: 'john@example.com',
          id: 1,
        },
        enrolledClasses: [
          {
            classId: 1,
            className: 'Mathematics 101',
            classCode: 'MATH101',
            teacherName: 'Dr. Smith',
          },
        ],
        upcomingTests: [
          {
            testId: 1,
            testTitle: 'Midterm Exam',
            dueDate: new Date(),
            className: 'Mathematics 101',
          },
        ],
        availableTests: [
          {
            testId: 2,
            testTitle: 'Quiz 1',
            className: 'Mathematics 101',
            classId: 1,
            date: new Date(),
            duration: 60,
            disableTime: null,
          },
        ],
        recentSubmissions: [],
      };

      mockDashboardService.getStudentDashboard.mockResolvedValue(
        expectedDashboard,
      );

      const result = await controller.getStudentDashboard(userId);

      expect(result).toEqual(expectedDashboard);
      expect(mockDashboardService.getStudentDashboard).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should handle empty dashboard data', async () => {
      const userId = 1;
      const emptyDashboard = {
        student: {
          name: 'New Student',
          email: 'student@example.com',
          id: 1,
        },
        enrolledClasses: [],
        upcomingTests: [],
        availableTests: [],
        recentSubmissions: [],
      };

      mockDashboardService.getStudentDashboard.mockResolvedValue(
        emptyDashboard,
      );

      const result = await controller.getStudentDashboard(userId);

      expect(result).toEqual(emptyDashboard);
      expect(result.enrolledClasses).toHaveLength(0);
      expect(result.upcomingTests).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      const error = new Error('Database error');
      mockDashboardService.getStudentDashboard.mockRejectedValue(error);

      await expect(controller.getStudentDashboard(userId)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getTeacherDashboard', () => {
    it('should return teacher dashboard data', async () => {
      const userId = 1;
      const expectedDashboard = {
        teacher: {
          name: 'Dr. Smith',
          id: 1,
          email: 'smith@example.com',
          role: 'teacher',
        },
        classes: [
          {
            classId: 1,
            className: 'Mathematics 101',
            classCode: 'MATH101',
            studentCount: 25,
          },
        ],
        upcomingTests: [
          {
            testId: 1,
            title: 'Midterm Exam',
            date: new Date(),
            className: 'Mathematics 101',
          },
        ],
        testAttempts: [
          {
            testId: 2,
            title: 'Quiz 1',
            className: 'Mathematics 101',
            totalStudents: 25,
            attemptedCount: 20,
            notAttemptedCount: 5,
            attemptPercentage: 80,
          },
        ],
        statistics: {
          totalClasses: 1,
          totalStudents: 25,
          upcomingTests: 1,
          completedTests: 1,
        },
      };

      mockDashboardService.getTeacherDashboard.mockResolvedValue(
        expectedDashboard,
      );

      const result = await controller.getTeacherDashboard(userId);

      expect(result).toEqual(expectedDashboard);
      expect(mockDashboardService.getTeacherDashboard).toHaveBeenCalledWith(
        userId,
      );
    });

    it('should handle new teacher with no data', async () => {
      const userId = 1;
      const emptyDashboard = {
        teacher: {
          name: 'New Teacher',
          id: 1,
          email: 'new@example.com',
          role: 'teacher',
        },
        classes: [],
        upcomingTests: [],
        testAttempts: [],
        statistics: {
          totalClasses: 0,
          totalStudents: 0,
          upcomingTests: 0,
          completedTests: 0,
        },
      };

      mockDashboardService.getTeacherDashboard.mockResolvedValue(
        emptyDashboard,
      );

      const result = await controller.getTeacherDashboard(userId);

      expect(result).toEqual(emptyDashboard);
      expect(result.classes).toHaveLength(0);
    });

    it('should handle service errors', async () => {
      const userId = 1;
      const error = new Error('Access denied');
      mockDashboardService.getTeacherDashboard.mockRejectedValue(error);

      await expect(controller.getTeacherDashboard(userId)).rejects.toThrow(
        'Access denied',
      );
    });
  });
});
