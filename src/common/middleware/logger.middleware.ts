import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import * as express from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  use(req: express.Request, res: express.Response, next: express.NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      this.logger.log(`${method} ${originalUrl} → ${res.statusCode} (${duration}ms)`);
    });

    next();
  }
}
