import { Test, TestingModule } from '@nestjs/testing';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { UserRole } from '../../generated/prisma';

describe('ClassController', () => {
  let controller: ClassController;
  let service: ClassService;

  const mockClassService = {
    createClass: jest.fn(),
    joinClass: jest.fn(),
    getUserClasses: jest.fn(),
    getClassById: jest.fn(),
    updateClass: jest.fn(),
    deleteClass: jest.fn(),
    leaveClass: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassController],
      providers: [
        {
          provide: ClassService,
          useValue: mockClassService,
        },
      ],
    }).compile();

    controller = module.get<ClassController>(ClassController);
    service = module.get<ClassService>(ClassService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createClass', () => {
    const createClassDto = { name: 'Test Class' };
    const userId = 1;

    it('should create a class', async () => {
      const expectedResult = {
        id: 1,
        name: createClassDto.name,
        teacherId: userId,
        classCode: 'ABC123',
      };

      mockClassService.createClass.mockResolvedValue(expectedResult);

      const result = await controller.createClass(userId, createClassDto);

      expect(result).toEqual(expectedResult);
      expect(mockClassService.createClass).toHaveBeenCalledWith(
        userId,
        createClassDto,
      );
    });
  });

  describe('joinClass', () => {
    const joinClassDto = { classCode: 'ABC123' };
    const userId = 1;

    it('should join a class', async () => {
      const expectedResult = {
        studentId: userId,
        classId: 1,
      };

      mockClassService.joinClass.mockResolvedValue(expectedResult);

      const result = await controller.joinClass(userId, joinClassDto);

      expect(result).toEqual(expectedResult);
      expect(mockClassService.joinClass).toHaveBeenCalledWith(
        userId,
        joinClassDto.classCode,
      );
    });
  });

  describe('getUserClasses', () => {
    const userId = 1;
    const userRole = UserRole.teacher;

    it('should get all classes for user', async () => {
      const expectedClasses = [
        { id: 1, name: 'Class 1' },
        { id: 2, name: 'Class 2' },
      ];

      mockClassService.getUserClasses.mockResolvedValue(expectedClasses);

      const result = await controller.getUserClasses(userId, userRole);

      expect(result).toEqual(expectedClasses);
      expect(mockClassService.getUserClasses).toHaveBeenCalledWith(
        userId,
        userRole,
      );
    });
  });

  describe('getClassById', () => {
    const userId = 1;
    const classId = 1;

    it('should get a specific class', async () => {
      const expectedClass = {
        id: classId,
        name: 'Test Class',
        teacherId: userId,
      };

      mockClassService.getClassById.mockResolvedValue(expectedClass);

      const result = await controller.getClassById(userId, classId);

      expect(result).toEqual(expectedClass);
      expect(mockClassService.getClassById).toHaveBeenCalledWith(
        userId,
        classId,
      );
    });
  });

  describe('updateClass', () => {
    const userId = 1;
    const classId = 1;
    const updateClassDto = { name: 'Updated Class' };

    it('should update a class', async () => {
      const expectedResult = {
        id: classId,
        name: updateClassDto.name,
        teacherId: userId,
      };

      mockClassService.updateClass.mockResolvedValue(expectedResult);

      const result = await controller.updateClass(
        userId,
        classId,
        updateClassDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockClassService.updateClass).toHaveBeenCalledWith(
        userId,
        classId,
        updateClassDto,
      );
    });
  });

  describe('deleteClass', () => {
    const userId = 1;
    const classId = 1;

    it('should delete a class', async () => {
      mockClassService.deleteClass.mockResolvedValue(undefined);

      const result = await controller.deleteClass(userId, classId);

      expect(result).toEqual({ message: 'Class deleted successfully' });
      expect(mockClassService.deleteClass).toHaveBeenCalledWith(
        userId,
        classId,
      );
    });
  });

  describe('leaveClass', () => {
    const userId = 1;
    const classId = 1;

    it('should allow a student to leave a class', async () => {
      const expectedResult = { message: 'Successfully left the class' };
      mockClassService.leaveClass.mockResolvedValue(expectedResult);

      const result = await controller.leaveClass(userId, classId);

      expect(result).toEqual(expectedResult);
      expect(mockClassService.leaveClass).toHaveBeenCalledWith(userId, classId);
    });
  });
});
