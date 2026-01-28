import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import {
  CreateTestDto,
  UpdateTestDto,
  AddQuestionsDto,
  UpdateQuestionDto,
  UpdateTestConfigDto,
} from "./test.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Test,
  Question,
  Submission,
  Answer,
  SubmissionStatus,
  UserRole,
} from "../typeorm/entities";

@Injectable()
export class TestService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Submission)
    private submissionRepository: Repository<Submission>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    private dataSource: DataSource,
  ) {}

  private async ensureTeacherOwnsClass(userId: number, classId: number) {
    const classEntity = await this.dataSource.getRepository("Class").findOne({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!classEntity) throw new NotFoundException("Class not found.");
    if (classEntity.teacherId !== userId)
      throw new ForbiddenException("You are not authorized for this class.");
  }

  private async ensureTeacherOwnsTest(userId: number, testId: number) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: { class: true },
      select: { id: true, class: { id: true, teacherId: true } },
    });

    if (!test) throw new NotFoundException("Test not found.");
    if (test.class.teacherId !== userId)
      throw new ForbiddenException("You cannot modify this test.");

    return test;
  }

  private async ensureTeacherOwnsQuestion(userId: number, questionId: number) {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: { test: { class: true } },
      select: { id: true, test: { id: true, class: { id: true, teacherId: true } } },
    });

    if (!question) throw new NotFoundException("Question not found.");
    if (question.test.class.teacherId !== userId)
      throw new ForbiddenException("You cannot modify this question.");

    return question;
  }

  private validateDates(startAt?: string, endAt?: string) {
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      throw new BadRequestException("End date must be after start date.");
    }
  }

  private parseDate(date?: string) {
    return date ? new Date(date) : undefined;
  }

  async createTest(dto: CreateTestDto, userId: number) {
    await this.ensureTeacherOwnsClass(userId, dto.classId);
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

  async updateTest(id: number, dto: UpdateTestDto, userId: number) {
    await this.ensureTeacherOwnsTest(userId, id);
    this.validateDates(dto.startAt, dto.endAt);

    const test = await this.testRepository.findOne({ where: { id } });
    if (!test) throw new NotFoundException("Test not found.");

    Object.assign(test, {
      ...dto,
      startAt: this.parseDate(dto.startAt),
      endAt: this.parseDate(dto.endAt),
    });

    return this.testRepository.save(test);
  }

  async updateTestConfig(testId: number, dto: UpdateTestConfigDto, userId: number) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      select: { id: true, classId: true, config: true },
    });

    if (!test) throw new NotFoundException("Test not found");

    await this.ensureTeacherOwnsClass(userId, test.classId);

    test.config = { ...(test.config as Record<string, any>), ...dto };

    return this.testRepository.save(test);
  }

  async deleteTest(id: number, userId: number) {
    await this.ensureTeacherOwnsTest(userId, id);

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

  async getQuestionsByTestId(testId: number, role: string) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      select: { numQuestions: true },
    });

    const allQuestions = await this.questionRepository.find({
      where: { testId },
      select: {
        id: true,
        text: true,
        type: true,
        options: true,
        correctAnswer: true,
        maxMarks: true,
      },
      order: { id: "ASC" },
    });

    if (
      !test?.numQuestions ||
      role === UserRole.TEACHER ||
      test.numQuestions >= allQuestions.length
    ) {
      return allQuestions;
    }

    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, test.numQuestions);

    return selected;
  }

  async addQuestions(testId: number, dto: AddQuestionsDto, userId: number) {
    await this.ensureTeacherOwnsTest(userId, testId);
    const questions = dto.questions.map((q) => this.questionRepository.create({ ...q, testId }));

    await this.questionRepository.save(questions);
    return { message: "Questions added successfully" };
  }

  async updateQuestion(id: number, dto: UpdateQuestionDto, userId: number) {
    await this.ensureTeacherOwnsQuestion(userId, id);

    const question = await this.questionRepository.findOne({ where: { id } });
    if (!question) throw new NotFoundException("Question not found.");

    Object.assign(question, dto);

    return this.questionRepository.save(question);
  }

  async removeQuestion(id: number, userId: number) {
    await this.ensureTeacherOwnsQuestion(userId, id);

    await this.questionRepository.delete({ id });
    return { message: "Question removed successfully" };
  }

  async getStudentsByTestId(testId: number, userId: number) {
    await this.ensureTeacherOwnsTest(userId, testId);

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

    if (test && test.submissions) {
      test.submissions = test.submissions.filter((s) => s.status === SubmissionStatus.IN_PROGRESS);
    }

    return test;
  }
}
