import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma';

describe('ClassService', () => {
  let service: ClassService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    class: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studentClassRelation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClass', () => {
    const createClassDto = { name: 'Test Class' };
    const teacherId = 1;

    it('should create a class for a teacher', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.teacher,
      });
      mockPrismaService.class.create.mockResolvedValue({
        id: 1,
        name: createClassDto.name,
        teacherId,
        classCode: 'ABC123',
      });

      const result = await service.createClass(teacherId, createClassDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(createClassDto.name);
      expect(mockPrismaService.class.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not a teacher', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });

      await expect(
        service.createClass(teacherId, createClassDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('joinClass', () => {
    const studentId = 1;
    const classCode = 'ABC123';

    it('should allow a student to join a class', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: 1,
        classCode,
      });
      mockPrismaService.studentClassRelation.findUnique.mockResolvedValue(null);
      mockPrismaService.studentClassRelation.create.mockResolvedValue({
        studentId,
        classId: 1,
      });

      const result = await service.joinClass(studentId, classCode);

      expect(result).toBeDefined();
      expect(mockPrismaService.studentClassRelation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if class does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue(null);

      await expect(service.joinClass(studentId, classCode)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if student is already in the class', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: 1,
        classCode,
      });
      mockPrismaService.studentClassRelation.findUnique.mockResolvedValue({
        studentId,
        classId: 1,
      });

      await expect(service.joinClass(studentId, classCode)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getUserClasses', () => {
    const userId = 1;

    it('should get classes for a teacher', async () => {
      const mockClasses = [
        { id: 1, name: 'Class 1' },
        { id: 2, name: 'Class 2' },
      ];

      mockPrismaService.class.findMany.mockResolvedValue(mockClasses);

      const result = await service.getUserClasses(userId, UserRole.teacher);

      expect(result).toEqual(mockClasses);
      expect(mockPrismaService.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teacherId: userId },
        }),
      );
    });

    it('should get classes for a student', async () => {
      const mockClasses = [
        { id: 1, name: 'Class 1' },
        { id: 2, name: 'Class 2' },
      ];

      mockPrismaService.class.findMany.mockResolvedValue(mockClasses);

      const result = await service.getUserClasses(userId, UserRole.student);

      expect(result).toEqual(mockClasses);
      expect(mockPrismaService.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            students: {
              some: {
                studentId: userId,
              },
            },
          },
        }),
      );
    });
  });

  describe('updateClass', () => {
    const teacherId = 1;
    const classId = 1;
    const updateDto = { name: 'Updated Class' };

    it('should update a class if user is the teacher', async () => {
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
        teacherId,
      });
      mockPrismaService.class.update.mockResolvedValue({
        id: classId,
        ...updateDto,
      });

      const result = await service.updateClass(teacherId, classId, updateDto);

      expect(result).toBeDefined();
      expect(result.name).toBe(updateDto.name);
      expect(mockPrismaService.class.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the teacher', async () => {
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
        teacherId: 999, // different teacher
      });

      await expect(
        service.updateClass(teacherId, classId, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteClass', () => {
    const teacherId = 1;
    const classId = 1;

    it('should delete a class if user is the teacher', async () => {
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
        teacherId,
      });
      mockPrismaService.class.delete.mockResolvedValue({ id: classId });

      await service.deleteClass(teacherId, classId);

      expect(mockPrismaService.class.delete).toHaveBeenCalledWith({
        where: { id: classId },
      });
    });

    it('should throw ForbiddenException if user is not the teacher', async () => {
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
        teacherId: 999, // different teacher
      });

      await expect(service.deleteClass(teacherId, classId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('leaveClass', () => {
    const studentId = 1;
    const classId = 1;

    it('should allow a student to leave a class they are enrolled in', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
      });
      mockPrismaService.studentClassRelation.findUnique.mockResolvedValue({
        studentId,
        classId,
      });
      mockPrismaService.studentClassRelation.delete.mockResolvedValue({});

      const result = await service.leaveClass(studentId, classId);

      expect(result).toEqual({ message: 'Successfully left the class' });
      expect(
        mockPrismaService.studentClassRelation.delete,
      ).toHaveBeenCalledWith({
        where: {
          studentId_classId: {
            studentId,
            classId,
          },
        },
      });
    });

    it('should throw ForbiddenException if user is not a student', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.teacher,
      });

      await expect(service.leaveClass(studentId, classId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockPrismaService.studentClassRelation.delete,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if class does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue(null);

      await expect(service.leaveClass(studentId, classId)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockPrismaService.studentClassRelation.delete,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if student is not enrolled in the class', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: UserRole.student,
      });
      mockPrismaService.class.findUnique.mockResolvedValue({
        id: classId,
      });
      mockPrismaService.studentClassRelation.findUnique.mockResolvedValue(null);

      await expect(service.leaveClass(studentId, classId)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockPrismaService.studentClassRelation.delete,
      ).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.leaveClass(studentId, classId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(
        mockPrismaService.studentClassRelation.delete,
      ).not.toHaveBeenCalled();
    });
  });
});
