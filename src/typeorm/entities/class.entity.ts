import {
  Column,
  Entity,
  Unique,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Test, ClassTeacher, StudentClass } from '.';

@Entity('class')
@Unique(['code'])
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Test, (test) => test.class)
  tests: Test[];

  @OneToMany(() => ClassTeacher, (ct) => ct.class)
  teachers: ClassTeacher[];

  @OneToMany(() => StudentClass, (sc) => sc.class)
  students: StudentClass[];
}
