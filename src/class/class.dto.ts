import {
  Min,
  IsInt,
  IsEnum,
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  Length,
} from "class-validator";
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

export class JoinClassDto {
  @ApiProperty({ example: "ABC123", description: "Class code to join" })
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  code: string;
}

export class ManageStudentDto {
  @ApiProperty({ example: 2, description: "ID of student to manage" })
  @IsInt()
  @Min(1)
  studentId: number;
}

export class ClassIdParamDto {
  @ApiProperty({ example: 1, description: "ID of the class" })
  @IsInt()
  @Min(1)
  classId: number;
}

export class InviteTeacherDto {
  @ApiProperty({ example: "teacher@example.com", description: "Email of the teacher to invite" })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: ClassTeacherRole.EDITOR,
    description: "Role to assign to the invited teacher",
    enum: ClassTeacherRole,
  })
  @IsEnum(ClassTeacherRole)
  role: ClassTeacherRole;
}
