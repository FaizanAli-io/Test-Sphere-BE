import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Repository } from 'typeorm';
import { ConfigService } from './config/config.service';
import { User } from './typeorm/entities';

const execFileAsync = promisify(execFile);

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}
  getHello(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Sphere Backend</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #1a1a1a;
            color: #e1e1e1;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
          }
          .header {
            text-align: center;
            padding: 2rem 0;
            background: #2d2d2d;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
            border: 1px solid #3d3d3d;
          }
          h1 {
            color: #61dafb;
            margin: 0;
            font-size: 2.5rem;
            text-shadow: 0 0 10px rgba(97,218,251,0.3);
          }
          h2 {
            color: #bb86fc;
            margin: 1.5rem 0;
          }
          .description {
            font-size: 1.2rem;
            color: #e1e1e1;
            margin: 1rem 0;
          }
          .team-section {
            background: #2d2d2d;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
            border: 1px solid #3d3d3d;
          }
          .team-member {
            margin: 0.5rem 0;
            font-size: 1.1rem;
            padding: 0.5rem;
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          .team-member:hover {
            background: #3d3d3d;
          }
          .docs-section {
            background: #2d2d2d;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            text-align: center;
            border: 1px solid #3d3d3d;
          }
          .api-link {
            display: inline-block;
            padding: 1rem 2rem;
            background: #61dafb;
            color: #1a1a1a;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 600;
            margin-top: 1rem;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            border: 1px solid transparent;
          }
          .api-link:hover {
            background: transparent;
            color: #61dafb;
            border-color: #61dafb;
            box-shadow: 0 0 15px rgba(97,218,251,0.3);
          }
          .roll-number {
            color: #bb86fc;
            font-size: 0.9rem;
            margin-left: 0.5rem;
            opacity: 0.8;
          }
          strong {
            color: #fff;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Sphere Backend</h1>
            <p class="description">An AI-Powered Test Management System</p>
          </div>
          
          <div class="team-section">
            <h2>Development Team</h2>
            <div class="team-member">
              <strong>Faizan Ali</strong>
              <span class="roll-number">(22I-2496)</span>
            </div>
            <div class="team-member">
              <strong>Zaid Vohra</strong>
              <span class="roll-number">(22K-4195)</span>
            </div>
            <div class="team-member">
              <strong>Hamail Rehman</strong>
              <span class="roll-number">(22K-4443)</span>
            </div>
          </div>
          
          <div class="docs-section">
            <h2>API Documentation</h2>
            <p>Explore our API endpoints and documentation:</p>
            <a href="/api" class="api-link">View API Documentation</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async deploy(password: string) {
    const configuredPassword = this.configService.get<string>('DEPLOY_PASSWORD');

    if (!configuredPassword) {
      throw new InternalServerErrorException('Deploy password is not configured.');
    }

    if (!this.isValidDeployPassword(password, configuredPassword)) {
      throw new UnauthorizedException('Invalid deploy password.');
    }

    try {
      const workingDirectory = process.cwd();
      const { stdout, stderr } = await execFileAsync('git', ['pull', 'origin', 'main'], {
        cwd: workingDirectory,
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: '0',
        },
        maxBuffer: 1024 * 1024,
      });

      return {
        status: 'OK',
        message: 'Deployment pull completed successfully.',
        output: stdout.trim() || stderr.trim() || 'Git pull completed.',
        workingDirectory,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown deployment error';
      this.logger.error(`Deploy pull failed: ${errorMessage}`);
      throw new InternalServerErrorException('Deployment pull failed.');
    }
  }

  async healthCheck() {
    try {
      await this.userRepository.query('SELECT 1');

      return {
        status: 'OK',
        message: 'API is healthy!',
      };
    } catch (error) {
      this.logger.error('Health check failed:', (error as Error)?.message);
      return {
        status: 'ERROR',
        message: 'API is not healthy.',
      };
    }
  }

  private isValidDeployPassword(candidate: string, configuredPassword: string): boolean {
    if (candidate.length !== configuredPassword.length) {
      return false;
    }

    return Buffer.from(candidate).equals(Buffer.from(configuredPassword));
  }
}
