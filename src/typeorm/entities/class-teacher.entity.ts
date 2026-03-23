import { Column, Entity, ManyToOne, JoinColumn, PrimaryColumn, CreateDateColumn } from 'typeorm';
import { User, Class } from '.';

export enum ClassTeacherRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
}

@Entity('class_teacher')
export class ClassTeacher {
  @PrimaryColumn()
  teacherId: number;

  @PrimaryColumn()
  classId: number;

  @Column({
    type: 'enum',
    enum: ClassTeacherRole,
  })
  role: ClassTeacherRole;

  @CreateDateColumn()
  assignedAt: Date;

  @ManyToOne(() => User, (user) => user.classTeachers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToOne(() => Class, (cls) => cls.teachers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'classId' })
  class: Class;
}
