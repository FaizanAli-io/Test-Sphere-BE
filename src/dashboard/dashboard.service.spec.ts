import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    studentClassRelation: {
      findMany: jest.fn(),
    },
    test: {
      findMany: jest.fn(),
    },
    testSubmission: {
      findMany: jest.fn(),
    },
    class: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStudentDashboard', () => {
    const mockStudent = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      role: UserRole.student,
    };

    it('should return student dashboard data', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.studentClassRelation.findMany.mockResolvedValue([
        {
          class: {
            id: 1,
            name: 'Mathematics 101',
            classCode: 'MATH101',
            teacher: { name: 'Dr. Smith' },
          },
        },
      ]);
      mockPrismaService.test.findMany
        .mockResolvedValueOnce([]) // upcomingTests
        .mockResolvedValueOnce([]) // availableTests
        .mockResolvedValueOnce([]); // for any other calls
      mockPrismaService.testSubmission.findMany.mockResolvedValue([]);

      const result = await service.getStudentDashboard(userId);

      expect(result).toHaveProperty('student');
      expect(result.student).toEqual({
        name: mockStudent.name,
        email: mockStudent.email,
        id: mockStudent.id,
      });
      expect(result).toHaveProperty('enrolledClasses');
      expect(result).toHaveProperty('upcomingTests');
      expect(result).toHaveProperty('availableTests');
      expect(result).toHaveProperty('recentSubmissions');
    });

    it('should throw ForbiddenException for non-student user', async () => {
      const userId = 1;
      const teacherUser = { ...mockStudent, role: UserRole.teacher };

      mockPrismaService.user.findUnique.mockResolvedValue(teacherUser);

      await expect(service.getStudentDashboard(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getStudentDashboard(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle empty enrolled classes', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.studentClassRelation.findMany.mockResolvedValue([]);
      mockPrismaService.test.findMany.mockResolvedValue([]);
      mockPrismaService.testSubmission.findMany.mockResolvedValue([]);

      const result = await service.getStudentDashboard(userId);

      expect(result.enrolledClasses).toHaveLength(0);
      expect(result.upcomingTests).toHaveLength(0);
    });

    it('should format enrolled classes correctly', async () => {
      const userId = 1;
      const mockClassRelation = {
        class: {
          id: 1,
          name: 'Mathematics 101',
          classCode: 'MATH101',
          teacher: { name: 'Dr. Smith' },
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockStudent);
      mockPrismaService.studentClassRelation.findMany.mockResolvedValue([
        mockClassRelation,
      ]);
      mockPrismaService.test.findMany.mockResolvedValue([]);
      mockPrismaService.testSubmission.findMany.mockResolvedValue([]);

      const result = await service.getStudentDashboard(userId);

      expect(result.enrolledClasses[0]).toEqual({
        classId: 1,
        className: 'Mathematics 101',
        classCode: 'MATH101',
        teacherName: 'Dr. Smith',
      });
    });
  });

  describe('getTeacherDashboard', () => {
    const mockTeacher = {
      id: 1,
      name: 'Dr. Smith',
      email: 'smith@example.com',
      role: UserRole.teacher,
    };

    it('should return teacher dashboard data', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.class.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Mathematics 101',
          classCode: 'MATH101',
          _count: { students: 25 },
        },
      ]);
      mockPrismaService.test.findMany
        .mockResolvedValueOnce([]) // upcomingTests
        .mockResolvedValueOnce([]); // testAttempts

      const result = await service.getTeacherDashboard(userId);

      expect(result).toHaveProperty('teacher');
      expect(result.teacher).toEqual(mockTeacher);
      expect(result).toHaveProperty('classes');
      expect(result).toHaveProperty('upcomingTests');
      expect(result).toHaveProperty('testAttempts');
      expect(result).toHaveProperty('statistics');
    });

    it('should throw ForbiddenException for non-teacher user', async () => {
      const userId = 1;
      const studentUser = { ...mockTeacher, role: UserRole.student };

      mockPrismaService.user.findUnique.mockResolvedValue(studentUser);

      await expect(service.getTeacherDashboard(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user not found', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getTeacherDashboard(userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should calculate statistics correctly', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.class.findMany.mockResolvedValue([
        {
          id: 1,
          name: 'Math 101',
          classCode: 'MATH101',
          _count: { students: 25 },
        },
        {
          id: 2,
          name: 'Math 102',
          classCode: 'MATH102',
          _count: { students: 30 },
        },
      ]);
      mockPrismaService.test.findMany
        .mockResolvedValueOnce([
          {
            id: 1,
            title: 'Test 1',
            date: new Date(),
            class: { name: 'Math 101' },
          },
          {
            id: 2,
            title: 'Test 2',
            date: new Date(),
            class: { name: 'Math 102' },
          },
        ]) // upcomingTests
        .mockResolvedValueOnce([
          {
            id: 3,
            title: 'Past Test',
            class: { name: 'Math 101', _count: { students: 25 } },
            _count: { testSubmissions: 20 },
          },
        ]); // testAttempts

      const result = await service.getTeacherDashboard(userId);

      expect(result.statistics).toEqual({
        totalClasses: 2,
        totalStudents: 55,
        upcomingTests: 2,
        completedTests: 1,
      });
    });

    it('should format test attempts correctly', async () => {
      const userId = 1;

      mockPrismaService.user.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.class.findMany.mockResolvedValue([]);
      mockPrismaService.test.findMany
        .mockResolvedValueOnce([]) // upcomingTests
        .mockResolvedValueOnce([
          {
            id: 1,
            title: 'Quiz 1',
            class: { name: 'Math 101', _count: { students: 20 } },
            _count: { testSubmissions: 15 },
          },
        ]); // testAttempts

      const result = await service.getTeacherDashboard(userId);

      expect(result.testAttempts[0]).toEqual({
        testId: 1,
        title: 'Quiz 1',
        className: 'Math 101',
        totalStudents: 20,
        attemptedCount: 15,
        notAttemptedCount: 5,
        attemptPercentage: 75,
      });
    });
  });
});
