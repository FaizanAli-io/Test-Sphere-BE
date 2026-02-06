import {
  Index,
  Column,
  Entity,
  Unique,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User, Question, Submission } from ".";

export enum GradingStatus {
  AUTOMATIC = "AUTOMATIC",
  PENDING = "PENDING",
  GRADED = "GRADED",
}

@Entity("answer")
@Index(["submissionId"])
@Unique(["studentId", "questionId"])
export class Answer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column()
  questionId: number;

  @Column()
  submissionId: number;

  @Column({ type: "text", nullable: true })
  answer: string | null;

  @Column({ type: "int", nullable: true })
  obtainedMarks: number | null;

  @Column({
    type: "enum",
    enum: GradingStatus,
    default: GradingStatus.PENDING,
  })
  gradingStatus: GradingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "studentId" })
  student: User;

  @ManyToOne(() => Question, (question) => question.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "questionId" })
  question: Question;

  @ManyToOne(() => Submission, (submission) => submission.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "submissionId" })
  submission: Submission;
}
