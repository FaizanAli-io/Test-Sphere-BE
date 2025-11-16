import * as fs from "fs";
import * as path from "path";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
  private readonly envFilePath = path.resolve(process.cwd(), ".env");
  private envVars: Record<string, string> = {};

  constructor() {
    this.loadEnvFile();
  }

  private loadEnvFile() {
    try {
      const fileContent = fs.readFileSync(this.envFilePath, "utf-16le");

      const lines = fileContent.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=").trim().replace(/^"|"$/g, "");
        if (key) {
          this.envVars[key.trim()] = value;
          process.env[key.trim()] = value;
        }
      }
    } catch (error) {
      console.error("❌ Failed to read .env file:", error.message);
    }
    console.log("✅ Environment variables loaded from .env file", this.envVars);
  }

  get<T = string>(key: string): T | undefined {
    return (this.envVars[key] ?? process.env[key]) as T | undefined;
  }
}
