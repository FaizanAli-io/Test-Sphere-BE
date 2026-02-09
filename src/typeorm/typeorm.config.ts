import "dotenv/config";
import { join } from "path";
import { DataSourceOptions } from "typeorm";

export function createTypeOrmConfig(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch (error) {
    throw new Error("DATABASE_URL is not a valid URL");
  }

  if (!url.hostname || !url.port || !url.pathname || !url.username || !url.password) {
    throw new Error("DATABASE_URL is missing required components");
  }

  return {
    type: "mysql",
    host: url.hostname,
    port: Number(url.port),
    database: url.pathname.replace(/^\//, ""),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),

    migrations: [join(__dirname, "migrations", "*.{ts,js}")],
    entities: [join(__dirname, "entities", "**", "*.entity.{ts,js}")],
  };
}
