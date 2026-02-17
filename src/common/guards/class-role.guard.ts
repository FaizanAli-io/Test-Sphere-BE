import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import {
  Test,
  Question,
  Submission,
  QuestionPool,
  ClassTeacher,
  UserRole,
  ClassTeacherRole,
} from "../../typeorm/entities";
import { GuardMode, CLASS_ROLE_KEY } from "../decorators/class-roles.decorator";

const ROLE_PRIORITY: Record<ClassTeacherRole, number> = {
  [ClassTeacherRole.OWNER]: 3,
  [ClassTeacherRole.EDITOR]: 2,
  [ClassTeacherRole.VIEWER]: 1,
};

type entityType = Test | Question | Submission | QuestionPool;

const CLASS_ID_SELECT = {
  test: {
    relations: { class: true },
    extractClassId: (entity: entityType) => (entity as Test).classId,
  },
  question: {
    relations: { test: { class: true } },
    extractClassId: (entity: entityType) => (entity as Question).test.classId,
  },
  submission: {
    relations: { test: { class: true } },
    extractClassId: (entity: entityType) => (entity as Submission).test.classId,
  },
  questionPool: {
    relations: { test: { class: true } },
    extractClassId: (entity: entityType) => (entity as QuestionPool).test.classId,
  },
};

@Injectable()
export class ClassRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(QuestionPool)
    private questionPoolRepository: Repository<QuestionPool>,
    @InjectRepository(ClassTeacher)
    private classTeacherRepository: Repository<ClassTeacher>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<{ role: ClassTeacherRole; mode?: GuardMode }>(
      CLASS_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!meta?.role) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("Unauthenticated request");
    if (user.role !== UserRole.TEACHER)
      throw new ForbiddenException("Only teachers can access class-level permissions");

    const mode: GuardMode = meta.mode || "class";

    let classId: number;

    if (mode === "class") {
      classId = Number(request.params?.classId ?? request.body?.classId);
      if (!classId) throw new BadRequestException("Class ID is required");
    } else {
      const repoMap: Record<string, Repository<any>> = {
        test: this.testRepository,
        question: this.questionRepository,
        submission: this.submissionRepository,
        questionPool: this.questionPoolRepository,
      };

      const paramKeyMap: Record<string, string> = {
        test: "testId",
        question: "questionId",
        submission: "submissionId",
        questionPool: "poolId",
      };

      const entityId = request.params[paramKeyMap[mode]];
      if (!entityId) throw new BadRequestException(`${paramKeyMap[mode]} is required`);

      const { relations, extractClassId } = CLASS_ID_SELECT[mode];
      const entity = await repoMap[mode].findOne({ where: { id: Number(entityId) }, relations });

      if (!entity) throw new NotFoundException(`${mode} not found`);
      classId = extractClassId(entity);
    }

    const record = await this.classTeacherRepository.findOne({
      where: { classId, teacherId: user.id },
      select: { role: true },
    });

    if (!record) throw new ForbiddenException("No access to this class");

    if (ROLE_PRIORITY[record.role] < ROLE_PRIORITY[meta.role])
      throw new ForbiddenException("Insufficient permissions for this class");

    return true;
  }
}
