import 'dotenv/config';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export function createTypeOrmConfig(): DataSourceOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  return {
    type: 'mysql',
    url: databaseUrl,
    extra: { connectionLimit: 25 },
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    entities: [join(__dirname, 'entities', '**', '*.entity.{ts,js}')],
  };
}
