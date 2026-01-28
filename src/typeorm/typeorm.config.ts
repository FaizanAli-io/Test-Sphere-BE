import { DataSource } from "typeorm";
import { User } from "./entities/user.entity";
import { Class } from "./entities/class.entity";
import { StudentClass } from "./entities/student-class.entity";
import { Test } from "./entities/test.entity";
import { Question } from "./entities/question.entity";
import { Submission } from "./entities/submission.entity";
import { Answer } from "./entities/answer.entity";
import { ProctoringLog } from "./entities/proctoring-log.entity";

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "3306", 10),
  username: process.env.DATABASE_USER || "root",
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE_NAME || "test_sphere",
  entities: [User, Class, StudentClass, Test, Question, Submission, Answer, ProctoringLog],
  synchronize: false,
  logging: process.env.NODE_ENV === "development",
});
