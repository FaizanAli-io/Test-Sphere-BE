import { DataSource } from "typeorm";
import { createTypeOrmConfig } from "./typeorm.config";

export default new DataSource(createTypeOrmConfig());
