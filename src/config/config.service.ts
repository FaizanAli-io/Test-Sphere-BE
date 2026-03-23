import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConfigService {
  private readonly envFilePath = path.resolve(process.cwd(), '.env');
  private envVars: Record<string, string> = {};
  private readonly logger = new Logger(ConfigService.name);

  constructor() {
    this.loadEnvFile();
  }

  private loadEnvFile() {
    const encodings: BufferEncoding[] = ['utf8', 'utf-16le'];
    let fileContent: string | undefined;

    for (const encoding of encodings) {
      try {
        fileContent = fs.readFileSync(this.envFilePath, encoding);
        break;
      } catch (error) {
        this.logger.warn(`⚠️ .env read failed with ${encoding}: ${(error as Error)?.message}`);
      }
    }

    if (!fileContent) {
      this.logger.error('❌ Failed to read .env file with supported encodings');
      return;
    }

    const lines = fileContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
      if (key) {
        this.envVars[key.trim()] = value;
        process.env[key.trim()] = value;
      }
    }
  }

  get<T = string>(key: string): T | undefined {
    return (this.envVars[key] ?? process.env[key]) as T | undefined;
  }
}
