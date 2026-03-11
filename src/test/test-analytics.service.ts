import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Not } from "typeorm";
import { Test, Question, QuestionPool, Submission, SubmissionStatus } from "../typeorm/entities";

@Injectable()
export class TestAnalyticsService {
  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(QuestionPool)
    private questionPoolRepository: Repository<QuestionPool>,
    private dataSource: DataSource,
  ) {}

  async getTestAnalytics(testId: number) {
    const test = await this.testRepository.findOne({
      where: { id: testId },
      relations: { questions: true, questionPools: true },
    });
    if (!test) throw new NotFoundException("Test not found.");

    const questions = test.questions;
    const pools = test.questionPools;
    const totalMarksPerTest = questions.reduce((a, q) => a + q.maxMarks, 0);

    // ── Pool-wise composition with marks breakdown ──
    const poolComposition = this.buildPoolComposition(questions, pools);

    // ── Overall question type composition ──
    const composition = { MULTIPLE_CHOICE: 0, TRUE_FALSE: 0, SHORT_ANSWER: 0, LONG_ANSWER: 0 };
    for (const q of questions) {
      if (q.type in composition) composition[q.type as keyof typeof composition]++;
    }

    // Fetch all submitted/graded submissions with answers
    const submissions = await this.dataSource.getRepository(Submission).find({
      where: { testId, status: Not(SubmissionStatus.IN_PROGRESS) },
      relations: { answers: { question: true } },
      order: { submittedAt: "ASC" },
    });

    const n = submissions.length;

    if (n === 0) {
      return {
        questionComposition: { ...composition, total: questions.length },
        poolComposition,
        performanceMetrics: {
          averageMarks: 0,
          averagePercentage: 0,
          averageGrade: "N/A",
          averageDurationMinutes: 0,
          totalSubmissions: 0,
          totalMarksPerTest,
        },
        scoreDistribution: Array.from({ length: 10 }, (_, i) => ({
          label: `${i * 10}-${(i + 1) * 10}%`,
          count: 0,
        })),
        questionDifficulty: [],
      };
    }

    // Per-submission score + duration aggregation
    const submissionScores: number[] = [];
    const durations: number[] = [];

    for (const sub of submissions) {
      const answers = sub.answers ?? [];
      let obtained = 0;
      let possible = 0;
      for (const ans of answers) {
        if (ans.obtainedMarks !== null) obtained += ans.obtainedMarks;
        if (ans.question) possible += ans.question.maxMarks;
      }
      const pct = possible > 0 ? Math.round((obtained / possible) * 100) : 0;
      submissionScores.push(pct);
      if (sub.startedAt && sub.submittedAt) {
        const ms = new Date(sub.submittedAt).getTime() - new Date(sub.startedAt).getTime();
        if (ms > 0) durations.push(ms);
      }
    }

    const avgPercentage = Math.round(submissionScores.reduce((a, b) => a + b, 0) / n);
    const avgMarks = Math.round((avgPercentage / 100) * totalMarksPerTest * 10) / 10;
    const avgDurationMinutes =
      durations.length > 0
        ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length / 60000) * 10) / 10
        : 0;

    const gradeFromPct = (pct: number) => {
      if (pct >= 90) return "A+";
      if (pct >= 80) return "A";
      if (pct >= 70) return "B";
      if (pct >= 60) return "C";
      if (pct >= 50) return "D";
      return "F";
    };

    // Score distribution (10 × 10% buckets)
    const scoreDistribution = Array.from({ length: 10 }, (_, i) => ({
      label: `${i * 10}-${(i + 1) * 10}%`,
      count: 0,
    }));
    for (const pct of submissionScores) {
      scoreDistribution[Math.min(Math.floor(pct / 10), 9)].count++;
    }

    // Question difficulty
    const qStatsArray = questions.map((q) => ({
      questionId: q.id,
      text: q.text,
      type: q.type as string,
      maxMarks: q.maxMarks,
      attempts: 0,
      totalObtained: 0,
      zeroCount: 0,
      poolId: q.questionPoolId,
      poolTitle: pools.find((p) => p.id === q.questionPoolId)?.title ?? null,
    }));
    const qStats = new Map(qStatsArray.map((qs) => [qs.questionId, qs]));

    for (const sub of submissions) {
      for (const ans of sub.answers ?? []) {
        const qs = qStats.get(ans.questionId);
        if (!qs) continue;
        qs.attempts++;
        if (ans.obtainedMarks !== null) {
          qs.totalObtained += ans.obtainedMarks;
          if (ans.obtainedMarks === 0) qs.zeroCount++;
        }
      }
    }

    const questionDifficulty = Array.from(qStats.values())
      .map((qs) => ({
        questionId: qs.questionId,
        text: qs.text,
        type: qs.type,
        maxMarks: qs.maxMarks,
        attempts: qs.attempts,
        avgObtained: qs.attempts > 0 ? Math.round((qs.totalObtained / qs.attempts) * 10) / 10 : 0,
        failureRate: qs.attempts > 0 ? Math.round((qs.zeroCount / qs.attempts) * 100) : 0,
        poolId: qs.poolId,
        poolTitle: qs.poolTitle,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);

    return {
      questionComposition: { ...composition, total: questions.length },
      poolComposition,
      performanceMetrics: {
        averageMarks: avgMarks,
        averagePercentage: avgPercentage,
        averageGrade: gradeFromPct(avgPercentage),
        averageDurationMinutes: avgDurationMinutes,
        totalSubmissions: n,
        totalMarksPerTest,
      },
      scoreDistribution,
      questionDifficulty,
    };
  }

  private buildPoolComposition(questions: Question[], pools: QuestionPool[]) {
    // Group questions by pool
    const poolMap = new Map<number | null, Question[]>();
    for (const q of questions) {
      const key = q.questionPoolId;
      if (!poolMap.has(key)) poolMap.set(key, []);
      poolMap.get(key)!.push(q);
    }

    const result: any[] = [];

    // Process each pool
    for (const pool of pools) {
      const poolQuestions = poolMap.get(pool.id) || [];
      const config: Record<string, number> = pool.config || {};
      const types = this.buildTypeBreakdown(poolQuestions, config);

      result.push({
        poolId: pool.id,
        poolTitle: pool.title,
        totalQuestions: poolQuestions.length,
        selectedQuestions: Object.values(config).reduce((a, b) => a + (Number(b) || 0), 0),
        totalMarks: poolQuestions.reduce((a, q) => a + q.maxMarks, 0),
        expectedMarks: types.reduce((a, t) => a + t.expectedMarks, 0),
        types,
      });
    }

    // Ungrouped questions (no pool)
    const ungrouped = poolMap.get(null) || [];
    if (ungrouped.length > 0) {
      const types = this.buildTypeBreakdown(ungrouped, null);
      result.push({
        poolId: null,
        poolTitle: "General Questions",
        totalQuestions: ungrouped.length,
        selectedQuestions: ungrouped.length,
        totalMarks: ungrouped.reduce((a, q) => a + q.maxMarks, 0),
        expectedMarks: types.reduce((a, t) => a + t.expectedMarks, 0),
        types,
      });
    }

    return result;
  }

  private buildTypeBreakdown(questions: Question[], poolConfig: Record<string, number> | null) {
    // Group by type
    const typeMap = new Map<string, Question[]>();
    for (const q of questions) {
      if (!typeMap.has(q.type)) typeMap.set(q.type, []);
      typeMap.get(q.type)!.push(q);
    }

    const types: any[] = [];
    for (const [type, qs] of typeMap) {
      const count = qs.length;
      const totalMarks = qs.reduce((a, q) => a + q.maxMarks, 0);
      const avgMarks = count > 0 ? Math.round((totalMarks / count) * 10) / 10 : 0;
      const selectionCount = poolConfig ? Number(poolConfig[type]) || 0 : count;
      const expectedMarks = Math.round(avgMarks * selectionCount * 10) / 10;

      types.push({
        type,
        count,
        totalMarks,
        avgMarks,
        selectionCount,
        expectedMarks,
      });
    }

    return types;
  }
}
