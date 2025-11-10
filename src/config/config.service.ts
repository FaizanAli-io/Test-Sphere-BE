import * as fs from 'fs';
import * as path from 'path';
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class ConfigService implements OnModuleInit {
  private readonly envFilePath = path.resolve(process.cwd(), '.env');
  private envVars: Record<string, string> = {};

  onModuleInit() {
    this.loadEnvFile();
  }

  private loadEnvFile() {
    try {
      const fileContent = fs.readFileSync(this.envFilePath, 'utf-8');

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
    } catch (error) {
      console.error('❌ Failed to read .env file:', error.message);
    }
  }

  get<T = string>(key: string): T | undefined {
    return (this.envVars[key] ?? process.env[key]) as T | undefined;
  }
}
