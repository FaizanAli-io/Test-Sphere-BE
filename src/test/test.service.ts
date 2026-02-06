import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";

import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
  UpdateTestConfigDto,
  CreateQuestionPoolDto,
  UpdateQuestionPoolDto,
} from "./test.dto";

import { TestMode } from "./test-mode.enum";
import { Repository, DataSource } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Test, Question, QuestionPool, SubmissionStatus, UserRole } from "../typeorm/entities";

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(QuestionPool)
    private questionPoolRepository: Repository<QuestionPool>,
    private dataSource: DataSource,
  ) {}

  private validateDates(startAt?: string, endAt?: string) {
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      throw new BadRequestException("End date must be after start date.");
    }
  }

  async createTest(dto: CreateTestDto) {
    this.validateDates(dto.startAt, dto.endAt);

    const test = this.testRepository.create({
      ...dto,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      config: {
        multipleScreens: false,
        webcamRequired: true,
        maxViolationCount: 0,
        maxViolationDuration: 0,
      },
    });

    return this.testRepository.save(test);
  }

  async getTestById(id: number) {
    const test = await this.testRepository.findOne({
      where: { id },
      relations: { questions: true },
    });

    if (!test) throw new NotFoundException("Test not found.");
    return test;
  }

  async getTestsByClassId(classId: number) {
    return this.testRepository.find({
      where: { classId },
      order: { createdAt: "DESC" },
    });
  }

  async updateTest(id: number, dto: UpdateTestDto) {
    this.validateDates(dto.startAt, dto.endAt);

    const test = await this.testRepository.findOne({ where: { id } });
    if (!test) throw new NotFoundException("Test not found.");

    const parseDate = (date?: string) => (date ? new Date(date) : undefined);

    Object.assign(test, {
      ...dto,
      startAt: parseDate(dto.startAt),
      endAt: parseDate(dto.endAt),
    });

    return this.testRepository.save(test);
  }

  async updateTestConfig(testId: number, dto: UpdateTestConfigDto) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      select: { id: true, classId: true, config: true },
    });

    if (!test) throw new NotFoundException("Test not found");

    test.config = { ...(test.config as Record<string, any>), ...dto };

    return this.testRepository.save(test);
  }

  async deleteTest(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete answers from all questions in this test
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("Answer")
        .where("questionId IN (SELECT id FROM Question WHERE testId = :testId)", { testId: id })
        .execute();

      // Delete questions
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("Question")
        .where("testId = :testId", { testId: id })
        .execute();

      // Delete submissions
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("Submission")
        .where("testId = :testId", { testId: id })
        .execute();

      // Delete question pools
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("QuestionPool")
        .where("testId = :testId", { testId: id })
        .execute();

      // Delete test
      await queryRunner.manager
        .createQueryBuilder()
        .delete()
        .from("Test")
        .where("id = :id", { id })
        .execute();

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return { message: "Test deleted successfully" };
  }

  async getQuestionsByTestId(testId: number, role: UserRole, mode?: TestMode) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      select: { id: true },
    });

    if (!test) throw new NotFoundException("Test not found.");

    const selectFields: Partial<Record<keyof Question, true>> = {
      id: true,
      text: true,
      type: true,
      options: true,
      maxMarks: true,
      correctAnswer: true,
      questionPoolId: true,
    };

    // Teachers always see all questions
    if (role === UserRole.TEACHER) {
      return this.questionRepository.find({
        where: { testId },
        select: selectFields,
        order: { id: "ASC" },
      });
    }

    // Determine effective mode (default STATIC)
    let effectiveMode: TestMode = TestMode.STATIC;
    if (mode) {
      if (mode === TestMode.POOL) effectiveMode = TestMode.POOL;
      else if (mode === TestMode.STATIC) effectiveMode = TestMode.STATIC;
      else throw new BadRequestException("Invalid mode");
    }

    // STATIC mode: include all questions
    if (effectiveMode === TestMode.STATIC) {
      return this.questionRepository.find({
        where: { testId },
        select: selectFields,
        order: { id: "ASC" },
      });
    }

    // POOL mode: select based on pools
    const pools = await this.questionPoolRepository.find({
      where: { testId },
      select: { id: true, config: true },
    });

    const selected: any[] = [];
    const selectedIds = new Set<number>();

    for (const pool of pools) {
      const poolQuestions = await this.questionRepository.find({
        where: { questionPoolId: pool.id },
        select: selectFields,
      });

      // Group by type
      const typeMap = new Map<string, typeof poolQuestions>([]);
      for (const q of poolQuestions) {
        const arr = typeMap.get(q.type) || [];
        arr.push(q);
        typeMap.set(q.type, arr);
      }

      for (const [typeKey, count] of Object.entries(pool.config || {})) {
        const need = Number(count) || 0;
        if (need <= 0) continue;
        const candidates = (typeMap.get(typeKey) || []).filter((q) => !selectedIds.has(q.id));
        if (!candidates.length) continue;

        // Shuffle candidates (Fisher-Yates)
        for (let i = candidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const take = Math.min(need, candidates.length);
        const chosen = candidates.slice(0, take);
        for (const q of chosen) {
          selectedIds.add(q.id);
          selected.push(q);
        }
      }
    }

    return selected;
  }

  async addQuestions(testId: number, dto: AddQuestionsDto) {
    const rows = dto.questions.map((q) => ({ ...q, testId }));
    return this.questionRepository.insert(rows);
  }

  async updateQuestion(id: number, dto: UpdateQuestionDto) {
    const question = await this.questionRepository.findOne({ where: { id } });
    if (!question) throw new NotFoundException("Question not found.");
    Object.assign(question, dto);

    return this.questionRepository.save(question);
  }

  async removeQuestion(id: number) {
    return this.questionRepository.delete({ id });
  }

  async getQuestionPoolsByTestId(testId: number) {
    return this.questionPoolRepository.find({
      where: { testId },
      order: { id: "ASC" },
    });
  }

  async getQuestionPoolById(id: number) {
    const pool = await this.questionPoolRepository.findOne({ where: { id } });
    if (!pool) throw new NotFoundException("Question pool not found.");
    return pool;
  }

  async createQuestionPool(testId: number, dto: CreateQuestionPoolDto) {
    const pool = this.questionPoolRepository.create({
      testId,
      title: dto.title,
      config: dto.config,
    });
    return this.questionPoolRepository.save(pool);
  }

  async updateQuestionPool(id: number, dto: UpdateQuestionPoolDto) {
    const pool = await this.getQuestionPoolById(id);
    Object.assign(pool, dto);

    return this.questionPoolRepository.save(pool);
  }

  async deleteQuestionPool(id: number) {
    return this.questionPoolRepository.delete({ id });
  }

  async addQuestionsToPool(poolId: number, questionIds: number[]) {
    const pool = await this.getQuestionPoolById(poolId);

    if (!questionIds || !questionIds.length)
      throw new BadRequestException("questionIds is required");

    // Only update questions that belong to the same test
    const result = await this.questionRepository
      .createQueryBuilder()
      .update()
      .set({ questionPoolId: poolId })
      .where("id IN (:...ids) AND testId = :testId", { ids: questionIds, testId: pool.test.id })
      .execute();

    return { message: "Questions added to pool successfully", affected: result.affected || 0 };
  }

  async removeQuestionsFromPool(poolId: number, questionIds: number[]) {
    await this.getQuestionPoolById(poolId);

    if (!questionIds || !questionIds.length)
      throw new BadRequestException("questionIds is required");

    const result = await this.questionRepository
      .createQueryBuilder()
      .update()
      .set({ questionPoolId: null })
      .where("id IN (:...ids) AND questionPoolId = :poolId", { ids: questionIds, poolId })
      .execute();

    return { message: "Questions removed from pool successfully", affected: result.affected || 0 };
  }

  async getStudentsByTestId(testId: number) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: { submissions: { user: true } },
      select: {
        id: true,
        submissions: {
          id: true,
          status: true,
          user: { id: true, name: true, email: true },
        },
      },
    });

    return {
      ...test,
      submissions: test?.submissions?.filter((s) => s.status === SubmissionStatus.IN_PROGRESS),
    };
  }
}
