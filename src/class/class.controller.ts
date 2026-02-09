import {
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Controller,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { UserRole, ClassTeacherRole } from "../typeorm/entities";
import { CreateClassDto, UpdateClassDto, ManageStudentDto, TeacherRoleDto } from "./class.dto";

import { ClassService } from "./class.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UserRoleGuard } from "../common/guards/user-role.guard";
import { ClassRoleGuard } from "../common/guards/class-role.guard";
import { GetUser } from "../common/decorators/get-user.decorator";
import { RequireUserRole } from "../common/decorators/user-roles.decorator";
import { RequireClassRole } from "../common/decorators/class-roles.decorator";

@ApiBearerAuth()
@ApiTags("Classes")
@Controller("classes")
@UseGuards(JwtAuthGuard, UserRoleGuard, ClassRoleGuard)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @RequireUserRole(UserRole.TEACHER)
  @ApiOperation({ summary: "Create a new class (Teacher only)" })
  @ApiResponse({ status: 201, description: "Class created successfully" })
  async createClass(@Body() dto: CreateClassDto, @GetUser("id") userId: number) {
    return this.classService.createClass(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: "Get all classes for current user" })
  @ApiResponse({ status: 200, description: "List of user classes" })
  async getMyClasses(@GetUser("id") userId: number, @GetUser("role") role: UserRole) {
    return this.classService.getMyClasses(userId, role);
  }

  @Get(":classId")
  @RequireClassRole(ClassTeacherRole.VIEWER)
  @ApiOperation({ summary: "Get class details by ID (All roles)" })
  @ApiResponse({ status: 200, description: "Class details returned" })
  async getClass(@Param("classId", ParseIntPipe) classId: number) {
    return this.classService.getClassById(classId);
  }

  @Patch(":classId")
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Update class details (Owner/Editor)" })
  @ApiResponse({ status: 200, description: "Class updated successfully" })
  async updateClass(@Param("classId", ParseIntPipe) classId: number, @Body() dto: UpdateClassDto) {
    return this.classService.updateClass(classId, dto);
  }

  @Delete(":classId")
  @RequireClassRole(ClassTeacherRole.OWNER)
  @ApiOperation({ summary: "Delete class (Owner only)" })
  @ApiResponse({ status: 200, description: "Class deleted successfully" })
  async deleteClass(@Param("classId", ParseIntPipe) classId: number) {
    return this.classService.deleteClass(classId);
  }

  @Post(":classId/approve")
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Approve student join request (Owner/Editor)" })
  @ApiResponse({ status: 200, description: "Student approved successfully" })
  async approveStudent(
    @Param("classId", ParseIntPipe) classId: number,
    @Body() dto: ManageStudentDto,
  ) {
    return this.classService.approveStudent(classId, dto);
  }

  @Post(":classId/remove")
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Remove a student from class (Owner/Editor)" })
  @ApiResponse({ status: 200, description: "Student removed from class" })
  async removeStudent(
    @Param("classId", ParseIntPipe) classId: number,
    @Body() dto: ManageStudentDto,
  ) {
    return this.classService.removeStudent(classId, dto);
  }

  @Post(":classId/approve-all")
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Approve all pending join requests (Owner/Editor)" })
  @ApiResponse({ status: 200, description: "All pending requests approved successfully" })
  async approveAllPending(@Param("classId", ParseIntPipe) classId: number) {
    return this.classService.approveAllPending(classId);
  }

  @Post(":classId/reject-all")
  @RequireClassRole(ClassTeacherRole.EDITOR)
  @ApiOperation({ summary: "Reject all pending join requests (Owner/Editor)" })
  @ApiResponse({ status: 200, description: "All pending requests rejected successfully" })
  async rejectAllPending(@Param("classId", ParseIntPipe) classId: number) {
    return this.classService.rejectAllPending(classId);
  }
}

@ApiBearerAuth()
@Controller("classes")
@ApiTags("Student Classes")
@UseGuards(JwtAuthGuard, UserRoleGuard, ClassRoleGuard)
export class StudentClassController {
  constructor(private readonly classService: ClassService) {}

  @Post(":classCode/join")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Join a class (Student only)" })
  @ApiResponse({ status: 200, description: "Successfully joined class" })
  async joinClass(@Param("classCode") code: string, @GetUser("id") userId: number) {
    return this.classService.joinClass(code, userId);
  }

  @Post(":classId/leave")
  @RequireUserRole(UserRole.STUDENT)
  @ApiOperation({ summary: "Leave a class (Student only)" })
  @ApiResponse({ status: 200, description: "Left class successfully" })
  async leaveClass(@Param("classId", ParseIntPipe) classId: number, @GetUser("id") userId: number) {
    return this.classService.leaveClass(classId, userId);
  }
}

@ApiBearerAuth()
@Controller("classes")
@ApiTags("Teacher Classes")
@UseGuards(JwtAuthGuard, UserRoleGuard, ClassRoleGuard)
export class TeacherClassController {
  constructor(private readonly classService: ClassService) {}

  @Get(":classId/inviteable-teachers")
  @RequireClassRole(ClassTeacherRole.OWNER)
  @ApiOperation({ summary: "Get inviteable teachers for a class (Owner only)" })
  @ApiResponse({ status: 200, description: "Inviteable teachers returned successfully" })
  async getInviteableTeachers(@Param("classId", ParseIntPipe) classId: number) {
    return this.classService.getInviteableTeachers(classId);
  }

  @Post(":classId/teachers/:teacherId")
  @RequireClassRole(ClassTeacherRole.OWNER)
  @ApiOperation({ summary: "Add a teacher to a class with a specific role" })
  async inviteTeacher(
    @Param("classId", ParseIntPipe) classId: number,
    @Param("teacherId", ParseIntPipe) teacherId: number,
    @Body() dto: TeacherRoleDto,
  ) {
    return this.classService.inviteTeacher(classId, teacherId, dto.role);
  }

  @Patch(":classId/teachers/:teacherId")
  @RequireClassRole(ClassTeacherRole.OWNER)
  @ApiOperation({ summary: "Update a teacher's role in a class" })
  async updateTeacherRole(
    @Param("classId", ParseIntPipe) classId: number,
    @Param("teacherId", ParseIntPipe) teacherId: number,
    @Body() dto: TeacherRoleDto,
  ) {
    return this.classService.updateTeacher(classId, teacherId, dto.role);
  }

  @Delete(":classId/teachers/:teacherId")
  @RequireClassRole(ClassTeacherRole.OWNER)
  @ApiOperation({ summary: "Remove a teacher from a class" })
  async removeTeacher(
    @Param("classId", ParseIntPipe) classId: number,
    @Param("teacherId", ParseIntPipe) teacherId: number,
  ) {
    return this.classService.removeTeacher(classId, teacherId);
  }
}
