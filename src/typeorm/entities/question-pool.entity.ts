import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Test } from "./test.entity";
import { Question } from "./question.entity";

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
