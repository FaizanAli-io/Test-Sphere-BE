import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { Test } from "./test.entity";
import { QuestionPool } from "./index";
import { Answer } from "./answer.entity";

export enum QuestionType {
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  SHORT_ANSWER = "SHORT_ANSWER",
  LONG_ANSWER = "LONG_ANSWER",
  TRUE_FALSE = "TRUE_FALSE",
}

@Entity("question")
@Index(["testId"])
@Index(["questionPoolId"])
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  testId: number;

  @Column({ type: "varchar", length: 1000 })
  text: string;

  @Column({
    type: "enum",
    enum: QuestionType,
  })
  type: QuestionType;

  @Column({ type: "json", nullable: true })
  options: any;

  @Column({ type: "int", nullable: true })
  correctAnswer: number | null;

  @Column({ type: "int", default: 1 })
  maxMarks: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  image: string | null;

  @ManyToOne(() => Test, (test) => test.questions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "testId" })
  test: Test;

  @Column({ nullable: true })
  questionPoolId: number | null;

  @ManyToOne(() => QuestionPool, (pool: QuestionPool) => pool.questions, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "questionPoolId" })
  questionPool: QuestionPool;

  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];
}
