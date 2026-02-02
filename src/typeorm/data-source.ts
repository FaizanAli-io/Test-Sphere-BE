import { DataSource } from "typeorm";
import { createTypeOrmConfig } from "./typeorm.config";

export const AppDataSource = new DataSource(createTypeOrmConfig());
