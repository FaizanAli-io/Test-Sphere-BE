import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Test } from "./test.entity";
import { StudentClass } from "./student-class.entity";

@Entity("class")
@Unique(["code"])
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10 })
  code: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column()
  teacherId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.teacherClasses, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "teacherId" })
  teacher: User;

  @OneToMany(() => StudentClass, (sc) => sc.class)
  students: StudentClass[];

  @OneToMany(() => Test, (test) => test.class)
  tests: Test[];
}
