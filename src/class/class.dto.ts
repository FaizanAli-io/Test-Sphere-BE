import { Min, IsInt, IsEnum, IsString, IsNotEmpty, IsOptional, Length } from "class-validator";
import { ClassTeacherRole } from "../typeorm/entities";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClassDto {
  @ApiProperty({ example: "Mathematics 101", description: "Name of the class" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "Basic mathematics course" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ example: "Advanced Mathematics 101" })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  name?: string;

  @ApiPropertyOptional({ example: "Updated course description" })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ManageStudentDto {
  @ApiProperty({ example: 2, description: "ID of student to manage" })
  @IsInt()
  @Min(1)
  studentId: number;
}

export class TeacherRoleDto {
  @ApiProperty({
    enum: ClassTeacherRole,
    example: ClassTeacherRole.EDITOR,
    description: "The role to assign to the teacher",
  })
  @IsNotEmpty()
  @IsEnum(ClassTeacherRole)
  role: ClassTeacherRole;
}
