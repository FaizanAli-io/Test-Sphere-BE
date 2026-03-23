import {
  Index,
  Column,
  Entity,
  Unique,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, Test, Answer, ProctoringLog } from '.';

export enum SubmissionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  GRADED = 'GRADED',
}

@Entity('submission')
@Index(['testId'])
@Unique(['userId', 'testId'])
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  testId: number;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.IN_PROGRESS,
  })
  status: SubmissionStatus;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  gradedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Test, (test) => test.submissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'testId' })
  test: Test;

  @OneToMany(() => Answer, (answer) => answer.submission)
  answers: Answer[];

  @OneToMany(() => ProctoringLog, (log) => log.submission)
  logs: ProctoringLog[];
}
