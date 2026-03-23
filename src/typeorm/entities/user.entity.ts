import {
  Column,
  Entity,
  Unique,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Answer, Submission, ClassTeacher, StudentClass } from '.';

export enum UserRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

@Entity('user')
@Unique(['email'])
@Unique(['firebaseId'])
@Unique(['cnic'])
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  firebaseId: string | null;

  @Column({ type: 'varchar', length: 20 })
  cnic: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage: string | null;

  @Column({ default: false })
  verified: boolean;

  @Column({ type: 'varchar', length: 6, nullable: true })
  otp: string | null;

  @Column({ type: 'datetime', nullable: true })
  otpExpiry: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Answer, (answer) => answer.student)
  answers: Answer[];

  @OneToMany(() => Submission, (submission) => submission.user)
  submissions: Submission[];

  @OneToMany(() => ClassTeacher, (ct) => ct.teacher)
  classTeachers: ClassTeacher[];

  @OneToMany(() => StudentClass, (sc) => sc.student)
  studentClasses: StudentClass[];
}
