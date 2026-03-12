import {
  Index,
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Test, Question } from ".";

@Entity("question_pool")
@Index(["testId"])
export class QuestionPool {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  testId: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "json" })
  config: any;

  @Column({ type: "boolean", default: true })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Test, (test) => test.questionPools, { onDelete: "CASCADE" })
  @JoinColumn({ name: "testId" })
  test: Test;

  @OneToMany(() => Question, (question) => question.questionPool)
  questions: Question[];
}
