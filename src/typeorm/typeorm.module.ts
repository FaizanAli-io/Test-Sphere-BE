import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@config/config.service";
import {
  Test,
  User,
  Class,
  Answer,
  Question,
  Submission,
  StudentClass,
  ProctoringLog,
} from "./entities";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>("DATABASE_URL");

        // Parse DATABASE_URL if available, otherwise use individual env vars
        let config: any = {
          type: "mysql",
          entities: [User, Test, Class, Answer, Question, Submission, StudentClass, ProctoringLog],
          // Temporarily enable sync to align schema with existing tables (per request).
          synchronize: true,
          logging: configService.get<string>("NODE_ENV") === "development",
        };

        if (databaseUrl) {
          // Parse connection string: mysql://user:pass@host:port/database
          const url = new URL(databaseUrl);
          config = {
            ...config,
            host: url.hostname,
            port: parseInt(url.port || "3306"),
            username: url.username,
            password: url.password,
            database: url.pathname.replace(/^\//, ""),
          };
        } else {
          // Fall back to individual env vars
          config = {
            ...config,
            host: configService.get<string>("DATABASE_HOST") || "localhost",
            port: parseInt(configService.get<string>("DATABASE_PORT") || "3306"),
            username: configService.get<string>("DATABASE_USER") || "root",
            password: configService.get<string>("DATABASE_PASSWORD") || "",
            database: configService.get<string>("DATABASE_NAME") || "test_sphere",
          };
        }

        return config;
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmConfigModule {}
