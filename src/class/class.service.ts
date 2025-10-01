import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  private generateClassCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async createClass(teacherId: number, createClassDto: CreateClassDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.teacher) {
      throw new ForbiddenException('Only teachers can create classes');
    }

    const classCode = this.generateClassCode();

    try {
      const newClass = await this.prisma.class.create({
        data: {
          name: createClassDto.name,
          teacherId,
          classCode,
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return newClass;
    } catch (error) {
      if (error.code === 'P2002') {
        // Retry with a new code if there's a unique constraint violation
        return this.createClass(teacherId, createClassDto);
      }
      throw error;
    }
  }

  async joinClass(studentId: number, classCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.student) {
      throw new ForbiddenException('Only students can join classes');
    }

    const classToJoin = await this.prisma.class.findUnique({
      where: { classCode },
    });

    if (!classToJoin) {
      throw new NotFoundException('Class not found');
    }

    // Check if student is already in the class
    const existingRelation = await this.prisma.studentClassRelation.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId: classToJoin.id,
        },
      },
    });

    if (existingRelation) {
      throw new ConflictException('Student is already in this class');
    }

    return this.prisma.studentClassRelation.create({
      data: {
        studentId,
        classId: classToJoin.id,
      },
      include: {
        class: true,
      },
    });
  }

  async getClassById(userId: number, classId: number) {
    const classWithDetails = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        students: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!classWithDetails) {
      throw new NotFoundException('Class not found');
    }

    // Check if user has access to this class
    if (
      classWithDetails.teacherId !== userId &&
      !classWithDetails.students.some((rel) => rel.studentId === userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    return classWithDetails;
  }

  async getUserClasses(userId: number, userRole: UserRole) {
    if (userRole === UserRole.teacher) {
      return this.prisma.class.findMany({
        where: { teacherId: userId },
        include: {
          students: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    } else {
      return this.prisma.class.findMany({
        where: {
          students: {
            some: {
              studentId: userId,
            },
          },
        },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }
  }

  async updateClass(
    teacherId: number,
    classId: number,
    updateClassDto: UpdateClassDto,
  ) {
    const classToUpdate = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classToUpdate) {
      throw new NotFoundException('Class not found');
    }

    if (classToUpdate.teacherId !== teacherId) {
      throw new ForbiddenException(
        'Only the teacher of this class can update it',
      );
    }

    return this.prisma.class.update({
      where: { id: classId },
      data: updateClassDto,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteClass(teacherId: number, classId: number) {
    const classToDelete = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classToDelete) {
      throw new NotFoundException('Class not found');
    }

    if (classToDelete.teacherId !== teacherId) {
      throw new ForbiddenException(
        'Only the teacher of this class can delete it',
      );
    }

    await this.prisma.class.delete({
      where: { id: classId },
    });
  }

  async leaveClass(studentId: number, classId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { role: true },
    });

    if (!user || user.role !== UserRole.student) {
      throw new ForbiddenException('Only students can leave classes');
    }

    const classToLeave = await this.prisma.class.findUnique({
      where: { id: classId },
    });

    if (!classToLeave) {
      throw new NotFoundException('Class not found');
    }

    // Check if student is actually in the class
    const existingRelation = await this.prisma.studentClassRelation.findUnique({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    if (!existingRelation) {
      throw new NotFoundException('Student is not enrolled in this class');
    }

    await this.prisma.studentClassRelation.delete({
      where: {
        studentId_classId: {
          studentId,
          classId,
        },
      },
    });

    return { message: 'Successfully left the class' };
  }
}
