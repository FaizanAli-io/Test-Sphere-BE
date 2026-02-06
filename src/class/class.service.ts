import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import {
  JoinClassDto,
  CreateClassDto,
  UpdateClassDto,
  ManageStudentDto,
  InviteTeacherDto,
} from "./class.dto";
import {
  User,
  Class,
  ClassTeacher,
  StudentClass,
  UserRole,
  ClassTeacherRole,
} from "../typeorm/entities";

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Class) private classRepository: Repository<Class>,
    @InjectRepository(ClassTeacher) private classTeacherRepository: Repository<ClassTeacher>,
    @InjectRepository(StudentClass) private studentClassRepository: Repository<StudentClass>,
  ) {}

  private generateClassCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
      "",
    );
  }

  async createClass(dto: CreateClassDto, userId: number) {
    const cls = this.classRepository.create({
      name: dto.name,
      code: this.generateClassCode(),
      description: dto.description ?? "",
    });

    const savedClass = await this.classRepository.save(cls);

    await this.classTeacherRepository.save({
      teacherId: userId,
      classId: savedClass.id,
      role: ClassTeacherRole.OWNER,
    });

    return savedClass;
  }

  async getMyClasses(userId: number, role: UserRole) {
    if (role === UserRole.TEACHER) {
      return this.classTeacherRepository.find({
        where: { teacherId: userId },
        relations: { class: { students: { student: true }, tests: true } },
      });
    }

    return this.studentClassRepository.find({
      where: { studentId: userId },
      relations: { class: { teachers: { teacher: true }, tests: true } },
    });
  }

  async getClassById(id: number) {
    const cls = await this.classRepository.findOne({
      where: { id },
      relations: {
        tests: true,
        students: { student: true },
        teachers: { teacher: true },
      },
    });
    if (!cls) throw new NotFoundException("Class not found");
    return cls;
  }

  async updateClass(id: number, dto: UpdateClassDto) {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException("Class not found");

    Object.assign(cls, dto);
    return this.classRepository.save(cls);
  }

  async deleteClass(id: number) {
    const cls = await this.classRepository.findOne({ where: { id } });
    if (!cls) throw new NotFoundException("Class not found");

    await this.classRepository.delete({ id });
    return { message: "Class deleted successfully" };
  }

  async approveStudent(classId: number, dto: ManageStudentDto) {
    const record = await this.studentClassRepository.findOne({
      where: { studentId: dto.studentId, classId },
    });
    if (!record) throw new NotFoundException("Join request not found");
    if (record.approved) throw new ConflictException("Student already approved");

    record.approved = true;
    await this.studentClassRepository.save(record);
    return { message: "Student approved successfully" };
  }

  async removeStudent(classId: number, dto: ManageStudentDto) {
    const studentClass = await this.studentClassRepository.findOne({
      where: { studentId: dto.studentId, classId },
    });
    if (!studentClass) throw new NotFoundException("Student not found in this class");

    await this.studentClassRepository.delete({ studentId: dto.studentId, classId });
    return { message: "Student removed from class" };
  }

  async approveAllPending(classId: number) {
    const result = await this.studentClassRepository
      .createQueryBuilder()
      .update(StudentClass)
      .set({ approved: true })
      .where("classId = :classId AND approved = :approved", { classId, approved: false })
      .execute();

    return {
      message: `${result.affected} student(s) approved successfully`,
      count: result.affected,
    };
  }

  async rejectAllPending(classId: number) {
    const result = await this.studentClassRepository
      .createQueryBuilder()
      .delete()
      .from(StudentClass)
      .where("classId = :classId AND approved = :approved", { classId, approved: false })
      .execute();

    return {
      message: `${result.affected} student(s) rejected successfully`,
      count: result.affected,
    };
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

  async leaveClass(classId: number, userId: number) {
    const record = await this.studentClassRepository.findOne({
      where: { studentId: userId, classId },
    });
    if (!record) throw new NotFoundException("You are not in this class");

    await this.studentClassRepository.delete({ studentId: userId, classId });
    return { message: "Left class successfully" };
  }

  async inviteTeacher(classId: number, dto: InviteTeacherDto) {
    const classRecord = await this.classRepository.findOne({ where: { id: classId } });
    if (!classRecord) throw new NotFoundException("Class not found");

    const invitedTeacher = await this.userRepository.findOne({
      where: { email: dto.email, role: UserRole.TEACHER },
    });
    if (!invitedTeacher) throw new NotFoundException("Teacher with this email does not exist");

    const existing = await this.classTeacherRepository.findOne({
      where: { classId, teacherId: invitedTeacher.id },
    });
    if (existing) throw new ConflictException("Teacher is already in this class");

    await this.classTeacherRepository.insert({
      classId,
      teacherId: invitedTeacher.id,
      role: dto.role,
    });

    return { message: `Teacher (${invitedTeacher.email}) added successfully as ${dto.role}` };
  }
}
