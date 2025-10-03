import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  private generateClassCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join('');
  }

  async createClass(teacherId: number, dto: CreateClassDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true },
    });
    if (!user || user.role !== UserRole.teacher)
      throw new ForbiddenException('Only teachers can create classes');

    const classCode = this.generateClassCode();
    try {
      return await this.prisma.class.create({
        data: { ...dto, teacherId, classCode },
        include: { teacher: { select: { id: true, name: true, email: true } } },
      });
    } catch (err) {
      if (err.code === 'P2002') return this.createClass(teacherId, dto);
      throw err;
    }
  }

  async joinClass(studentId: number, classCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });
    if (!user || user.role !== UserRole.student)
      throw new ForbiddenException('Only students can join classes');

    const cls = await this.prisma.class.findUnique({ where: { classCode } });
    if (!cls) throw new NotFoundException('Class not found');

    const existing = await this.prisma.studentClassRelation.findUnique({
      where: { studentId_classId: { studentId, classId: cls.id } },
    });
    if (existing) throw new ConflictException('Student already in class');

    return this.prisma.studentClassRelation.create({
      data: { studentId, classId: cls.id },
      include: { class: true },
    });
  }

  async getClassById(userId: number, classId: number) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { id: true, name: true, email: true } },
        students: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const isTeacher = cls.teacherId === userId;
    const isStudent = cls.students.some((rel) => rel.studentId === userId);
    if (!isTeacher && !isStudent) throw new ForbiddenException('Access denied');

    return cls;
  }

  async getUserClasses(userId: number, role: UserRole) {
    if (role === UserRole.teacher) {
      return this.prisma.class.findMany({
        where: { teacherId: userId },
        include: {
          students: {
            include: {
              student: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    }
    return this.prisma.class.findMany({
      where: { students: { some: { studentId: userId } } },
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateClass(teacherId: number, classId: number, dto: UpdateClassDto) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId)
      throw new ForbiddenException('Only the teacher can update');

    return this.prisma.class.update({
      where: { id: classId },
      data: dto,
      include: { teacher: { select: { id: true, name: true, email: true } } },
    });
  }

  async deleteClass(teacherId: number, classId: number) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacherId !== teacherId)
      throw new ForbiddenException('Only the teacher can delete');

    await this.prisma.class.delete({ where: { id: classId } });
  }

  async leaveClass(studentId: number, classId: number) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');

    const rel = await this.prisma.studentClassRelation.findUnique({
      where: { studentId_classId: { studentId, classId } },
    });
    if (!rel) throw new NotFoundException('Not enrolled in this class');

    await this.prisma.studentClassRelation.delete({
      where: { studentId_classId: { studentId, classId } },
    });
    return { message: 'Successfully left the class' };
  }

  async getClassStudents(classId: number, requesterId: number) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const isTeacher = cls.teacherId === requesterId;
    const isStudent = cls.students.some((rel) => rel.studentId === requesterId);
    if (!isTeacher && !isStudent) throw new ForbiddenException('Access denied');

    return cls.students.map((rel) => rel.student);
  }
}
