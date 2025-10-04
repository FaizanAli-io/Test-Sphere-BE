import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from '../src/class/class.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('ClassService', () => {
  let service: ClassService;
  let prisma: PrismaService;

  const mockPrisma = {
    class: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studentClass: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  // =====================================================
  // CREATE CLASS
  // =====================================================
  describe('createClass', () => {
    const dto = { name: 'Math', description: 'Algebra' };

    it('should throw if not teacher', async () => {
      await expect(
        service.createClass(dto, 1, UserRole.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create class if teacher', async () => {
      mockPrisma.class.create.mockResolvedValue({ id: 1, ...dto });
      const result = await service.createClass(dto, 1, UserRole.TEACHER);
      expect(result).toEqual({ id: 1, ...dto });
      expect(mockPrisma.class.create).toHaveBeenCalled();
    });
  });

  // =====================================================
  // JOIN CLASS
  // =====================================================
  describe('joinClass', () => {
    const dto = { code: 'ABC123' };

    it('should throw if not student', async () => {
      await expect(service.joinClass(dto, 1, UserRole.TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.joinClass(dto, 1, UserRole.STUDENT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if already joined', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.studentClass.findUnique.mockResolvedValue({ id: 1 });
      await expect(service.joinClass(dto, 1, UserRole.STUDENT)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should join successfully', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.studentClass.findUnique.mockResolvedValue(null);
      const result = await service.joinClass(dto, 1, UserRole.STUDENT);
      expect(result.message).toContain('Joined class');
    });
  });

  // =====================================================
  // GET MY CLASSES
  // =====================================================
  describe('getMyClasses', () => {
    it('should get teacher classes', async () => {
      mockPrisma.class.findMany.mockResolvedValue([{ id: 1 }]);
      const res = await service.getMyClasses(1, UserRole.TEACHER);
      expect(res).toEqual([{ id: 1 }]);
    });

    it('should get student classes', async () => {
      mockPrisma.studentClass.findMany.mockResolvedValue([{ id: 1 }]);
      const res = await service.getMyClasses(1, UserRole.STUDENT);
      expect(res).toEqual([{ id: 1 }]);
    });
  });

  // =====================================================
  // UPDATE / DELETE CLASS
  // =====================================================
  describe('updateClass', () => {
    const dto = { name: 'Updated' };

    it('should throw if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.updateClass(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not owner', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 99 });
      await expect(
        service.updateClass(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update successfully', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 1 });
      mockPrisma.class.update.mockResolvedValue({ id: 1, ...dto });
      const res = await service.updateClass(1, dto, 1, UserRole.TEACHER);
      expect(res).toEqual({ id: 1, ...dto });
    });
  });

  describe('deleteClass', () => {
    it('should throw if not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(service.deleteClass(1, 1, UserRole.TEACHER)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete if owner', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 1 });
      mockPrisma.class.delete.mockResolvedValue({});
      const res = await service.deleteClass(1, 1, UserRole.TEACHER);
      expect(res.message).toContain('deleted');
    });
  });

  // =====================================================
  // KICK / LEAVE CLASS
  // =====================================================
  describe('kickStudent', () => {
    const dto = { studentId: 2 };

    it('should throw if class not found', async () => {
      mockPrisma.class.findUnique.mockResolvedValue(null);
      await expect(
        service.kickStudent(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if not teacher or owner', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 99 });
      await expect(
        service.kickStudent(1, dto, 1, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should remove student successfully', async () => {
      mockPrisma.class.findUnique.mockResolvedValue({ id: 1, teacherId: 1 });
      const res = await service.kickStudent(1, dto, 1, UserRole.TEACHER);
      expect(res.message).toContain('Student removed');
    });
  });

  describe('leaveClass', () => {
    it('should throw if not student', async () => {
      await expect(service.leaveClass(1, 1, UserRole.TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw if record not found', async () => {
      mockPrisma.studentClass.findUnique.mockResolvedValue(null);
      await expect(service.leaveClass(1, 1, UserRole.STUDENT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should leave successfully', async () => {
      mockPrisma.studentClass.findUnique.mockResolvedValue({ id: 1 });
      const res = await service.leaveClass(1, 1, UserRole.STUDENT);
      expect(res.message).toContain('Left class successfully');
    });
  });
});
