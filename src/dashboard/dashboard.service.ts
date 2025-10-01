import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../../generated/prisma';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStudentDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user || user.role !== UserRole.student) {
      throw new ForbiddenException(
        'Access denied. Only students can access the dashboard.',
      );
    }

    // Get enrolled classes
    const enrolledClasses = await this.prisma.studentClassRelation.findMany({
      where: { studentId: userId },
      include: {
        class: {
          include: {
            teacher: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Get upcoming tests
    const upcomingTests = await this.prisma.test.findMany({
      where: {
        class: {
          students: {
            some: { studentId: userId },
          },
        },
        date: { gt: new Date() },
      },
      include: {
        class: {
          select: { name: true },
        },
      },
      orderBy: { date: 'asc' },
      take: 5,
    });

    // Get available tests (not yet attempted and not disabled)
    const availableTests = await this.prisma.test.findMany({
      where: {
        class: {
          students: {
            some: { studentId: userId },
          },
        },
        disableTime: { gt: new Date() },
        date: { lte: new Date() },
        testSubmissions: {
          none: { userId: userId },
        },
      },
      include: {
        class: {
          select: { name: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Get recent submissions
    const recentSubmissions = await this.prisma.testSubmission.findMany({
      where: { userId: userId },
      include: {
        test: {
          select: { title: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: 5,
    });

    return {
      student: {
        name: user.name,
        email: user.email,
        id: user.id,
      },
      enrolledClasses: enrolledClasses.map((relation) => ({
        classId: relation.class.id,
        className: relation.class.name,
        classCode: relation.class.classCode,
        teacherName: relation.class.teacher?.name || 'Unknown',
      })),
      upcomingTests: upcomingTests.map((test) => ({
        testId: test.id,
        testTitle: test.title,
        dueDate: test.date,
        className: test.class?.name || 'Unknown',
      })),
      availableTests: availableTests.map((test) => ({
        testId: test.id,
        testTitle: test.title,
        className: test.class?.name || 'Unknown',
        classId: test.classId,
        date: test.date,
        duration: test.duration,
        disableTime: test.disableTime,
      })),
      recentSubmissions: recentSubmissions.map((submission) => ({
        testId: submission.testId,
        testTitle: submission.test.title,
        submittedAt: submission.submittedAt,
        status: submission.submittedAt ? 'Submitted' : 'Pending',
      })),
    };
  }

  async getTeacherDashboard(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user || user.role !== UserRole.teacher) {
      throw new ForbiddenException(
        'Access denied. Only teachers can access this dashboard.',
      );
    }

    // Get teacher's classes with student count
    const classes = await this.prisma.class.findMany({
      where: { teacherId: userId },
      include: {
        _count: {
          select: { students: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Get upcoming tests
    const upcomingTests = await this.prisma.test.findMany({
      where: {
        class: { teacherId: userId },
        date: { gt: new Date() },
      },
      include: {
        class: {
          select: { name: true },
        },
      },
      orderBy: { date: 'asc' },
      take: 5,
    });

    // Get test attempts data
    const testAttempts = await this.prisma.test.findMany({
      where: {
        class: { teacherId: userId },
        date: { lte: new Date() },
      },
      include: {
        class: {
          select: {
            name: true,
            _count: {
              select: { students: true },
            },
          },
        },
        _count: {
          select: { testSubmissions: true },
        },
      },
      orderBy: { date: 'desc' },
      take: 5,
    });

    const formattedTestAttempts = testAttempts.map((test) => {
      const totalStudents = test.class?._count.students || 0;
      const attemptedCount = test._count.testSubmissions;
      const notAttemptedCount = totalStudents - attemptedCount;
      const attemptPercentage =
        totalStudents > 0
          ? Math.round((attemptedCount / totalStudents) * 100)
          : 0;

      return {
        testId: test.id,
        title: test.title,
        className: test.class?.name || 'Unknown',
        totalStudents,
        attemptedCount,
        notAttemptedCount,
        attemptPercentage,
      };
    });

    // Calculate statistics
    const totalClasses = classes.length;
    const totalStudents = classes.reduce(
      (sum, cls) => sum + cls._count.students,
      0,
    );
    const upcomingTestsCount = upcomingTests.length;
    const completedTestsCount = testAttempts.length;

    return {
      teacher: user,
      classes: classes.map((cls) => ({
        classId: cls.id,
        className: cls.name,
        classCode: cls.classCode,
        studentCount: cls._count.students,
      })),
      upcomingTests: upcomingTests.map((test) => ({
        testId: test.id,
        title: test.title,
        date: test.date,
        className: test.class?.name || 'Unknown',
      })),
      testAttempts: formattedTestAttempts,
      statistics: {
        totalClasses,
        totalStudents,
        upcomingTests: upcomingTestsCount,
        completedTests: completedTestsCount,
      },
    };
  }
}
