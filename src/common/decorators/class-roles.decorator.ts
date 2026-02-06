import { SetMetadata } from "@nestjs/common";
import { ClassTeacherRole } from "../../typeorm/entities";

export const CLASS_ROLE_KEY = "class_role";

export type GuardMode = "class" | "test" | "question" | "questionPool";

export const RequireClassRole = (role: ClassTeacherRole, mode: GuardMode = "class") =>
  SetMetadata(CLASS_ROLE_KEY, { role, mode });
