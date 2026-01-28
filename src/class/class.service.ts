import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JoinClassDto, CreateClassDto, UpdateClassDto, ManageStudentDto } from "./class.dto";
import { UserRole, Class, StudentClass, User } from "../typeorm/entities";

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(StudentClass)
    private studentClassRepository: Repository<StudentClass>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private generateClassCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      "",
    );
  }

  async createClass(dto: CreateClassDto, userId: number) {
    const newClass = this.classRepository.create({
      name: dto.name,
      description: dto.description ?? "",
      code: this.generateClassCode(),
      teacherId: userId,
    });

    return this.classRepository.save(newClass);
  }

  async joinClass(dto: JoinClassDto, userId: number) {
    const found = await this.classRepository.findOne({
      where: { code: dto.code },
    });
    if (!found) throw new NotFoundException("Class not found");

    const already = await this.studentClassRepository.findOne({
      where: { studentId: userId, classId: found.id },
    });
    if (already) throw new ConflictException("Already joined this class");

    const studentClass = this.studentClassRepository.create({
      studentId: userId,
      classId: found.id,
    });

    await this.studentClassRepository.save(studentClass);

    return {
      message: "Join request sent, awaiting teacher approval",
      class: found,
    };
  }

  async getMyClasses(userId: number, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.classRepository.find({
        where: { teacherId: userId },
        relations: { students: { student: true }, tests: true },
      });
    }

    return this.studentClassRepository.find({
      where: { studentId: userId },
      relations: { class: { teacher: true, tests: true } },
    });
  }

  async getClassById(id: number) {
    const cls = await this.classRepository.findOne({
      where: { id },
      relations: {
        tests: true,
        teacher: true,
        students: { student: true },
      },
    });
    if (!cls) throw new NotFoundException("Class not found");
    return cls;
  }

  async updateClass(id: number, dto: UpdateClassDto, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("You cannot edit this class");

    Object.assign(cls, dto);

    return this.classRepository.save(cls);
  }

  async deleteClass(id: number, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("You cannot delete this class");

    await this.classRepository.delete({ id });
    return { message: "Class deleted successfully" };
  }

  async leaveClass(classId: number, userId: number) {
    const record = await this.studentClassRepository.findOne({
      where: { studentId: userId, classId },
    });
    if (!record) throw new NotFoundException("You are not in this class");

    await this.studentClassRepository.delete({
      studentId: userId,
      classId,
    });

    return { message: "Left class successfully" };
  }

  async removeStudent(classId: number, dto: ManageStudentDto, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("Only teacher can remove students");

    const studentClass = await this.studentClassRepository.findOne({
      where: { studentId: dto.studentId, classId },
    });

    if (!studentClass) throw new NotFoundException("Student not found in this class");

    await this.studentClassRepository.delete({
      studentId: dto.studentId,
      classId,
    });

    return { message: "Student removed from class" };
  }

  async approveStudent(classId: number, dto: ManageStudentDto, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("Only teacher can approve students");

    const { studentId } = dto;

    const record = await this.studentClassRepository.findOne({
      where: { studentId, classId },
    });
    if (!record) throw new NotFoundException("Join request not found");
    if (record.approved) throw new ConflictException("Student already approved");

    record.approved = true;
    await this.studentClassRepository.save(record);

    return { message: "Student approved successfully" };
  }

  async approveAllPending(classId: number, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("Only teacher can approve students");

    const result = await this.studentClassRepository
      .createQueryBuilder()
      .update(StudentClass)
      .set({ approved: true })
      .where("classId = :classId AND approved = :approved", {
        classId,
        approved: false,
      })
      .execute();

    return {
      message: `${result.affected} student(s) approved successfully`,
      count: result.affected,
    };
  }

  async rejectAllPending(classId: number, userId: number) {
    const cls = await this.classRepository.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException("Class not found");
    if (cls.teacherId !== userId) throw new ForbiddenException("Only teacher can reject students");

    const result = await this.studentClassRepository
      .createQueryBuilder()
      .delete()
      .from(StudentClass)
      .where("classId = :classId AND approved = :approved", {
        classId,
        approved: false,
      })
      .execute();

    return {
      message: `${result.affected} student(s) rejected successfully`,
      count: result.affected,
    };
  }
}
