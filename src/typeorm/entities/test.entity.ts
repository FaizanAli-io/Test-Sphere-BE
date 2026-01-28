import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Class } from "./class.entity";
import { Question } from "./question.entity";
import { Submission } from "./submission.entity";

export enum TestStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED",
  DRAFT = "DRAFT",
}

@Entity("test")
export class Test {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classId: number;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ nullable: true })
  numQuestions: number;

  @Column()
  duration: number;

  @Column({ type: "datetime" })
  startAt: Date;

  @Column({ type: "datetime" })
  endAt: Date;

  @Column({
    type: "enum",
    enum: TestStatus,
    default: TestStatus.DRAFT,
  })
  status: TestStatus;

  @Column({ type: "json", nullable: true })
  config: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Class, (cls) => cls.tests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "classId" })
  class: Class;

  @OneToMany(() => Question, (question) => question.test)
  questions: Question[];

  @OneToMany(() => Submission, (submission) => submission.test)
  submissions: Submission[];
}
