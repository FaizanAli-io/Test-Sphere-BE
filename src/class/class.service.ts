import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';

import {
  CreateClassDto,
  UpdateClassDto,
  JoinClassDto,
  KickStudentDto,
} from './class.dto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  private generateClassCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async createClass(dto: CreateClassDto, userId: number, role: UserRole) {
    if (role !== UserRole.TEACHER)
      throw new ForbiddenException('Only teachers can create classes');

    return this.prisma.class.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        code: this.generateClassCode(),
        teacherId: userId,
      },
    });
  }

  async joinClass(dto: JoinClassDto, userId: number, role: UserRole) {
    if (role !== UserRole.STUDENT)
      throw new ForbiddenException('Only students can join classes');

    const found = await this.prisma.class.findUnique({
      where: { code: dto.code },
    });
    if (!found) throw new NotFoundException('Class not found');

    const already = await this.prisma.studentClass.findUnique({
      where: { studentId_classId: { studentId: userId, classId: found.id } },
    });
    if (already) throw new ConflictException('Already joined this class');

    await this.prisma.studentClass.create({
      data: { studentId: userId, classId: found.id },
    });

    return { message: 'Joined class successfully', class: found };
  }

  async getMyClasses(userId: number, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.prisma.class.findMany({
        where: { teacherId: userId },
        include: { students: { include: { student: true } }, tests: true },
      });
    }

    return this.prisma.studentClass.findMany({
      where: { studentId: userId },
      include: { class: { include: { teacher: true, tests: true } } },
    });
  }

  async getClassById(id: number) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        teacher: true,
        students: { include: { student: true } },
        tests: true,
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async updateClass(
    id: number,
    dto: UpdateClassDto,
    userId: number,
    role: UserRole,
  ) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (role !== UserRole.TEACHER || cls.teacherId !== userId)
      throw new ForbiddenException('You cannot edit this class');

    return this.prisma.class.update({
      where: { id },
      data: { ...dto },
    });
  }

  async deleteClass(id: number, userId: number, role: UserRole) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (role !== UserRole.TEACHER || cls.teacherId !== userId)
      throw new ForbiddenException('You cannot delete this class');

    await this.prisma.class.delete({ where: { id } });
    return { message: 'Class deleted successfully' };
  }

  async kickStudent(
    classId: number,
    dto: KickStudentDto,
    userId: number,
    role: UserRole,
  ) {
    const cls = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (role !== UserRole.TEACHER || cls.teacherId !== userId)
      throw new ForbiddenException('Only teacher can remove students');

    await this.prisma.studentClass.delete({
      where: { studentId_classId: { studentId: dto.studentId, classId } },
    });
    return { message: 'Student removed from class' };
  }

  async leaveClass(classId: number, userId: number, role: UserRole) {
    if (role !== UserRole.STUDENT)
      throw new ForbiddenException('Only students can leave classes');

    const record = await this.prisma.studentClass.findUnique({
      where: { studentId_classId: { studentId: userId, classId } },
    });
    if (!record) throw new NotFoundException('You are not in this class');

    await this.prisma.studentClass.delete({
      where: { studentId_classId: { studentId: userId, classId } },
    });

    return { message: 'Left class successfully' };
  }
}
