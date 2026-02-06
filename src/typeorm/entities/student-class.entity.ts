import { Entity, Column, ManyToOne, PrimaryColumn, JoinColumn, CreateDateColumn } from "typeorm";
import { User, Class } from ".";

@Entity("student_class")
export class StudentClass {
  @PrimaryColumn()
  studentId: number;

  @PrimaryColumn()
  classId: number;

  @Column({ default: false })
  approved: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => User, (user) => user.studentClasses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "studentId" })
  student: User;

  @ManyToOne(() => Class, (cls) => cls.students, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "classId" })
  class: Class;
}
