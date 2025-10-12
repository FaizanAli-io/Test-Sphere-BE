import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const currentTime = new Date().toLocaleTimeString('en-PK', {
        timeZone: 'Asia/Karachi',
        hour12: true,
      });

      console.log(
        `📥 [${currentTime}] ${method} ${originalUrl} → ${res.statusCode} (${duration}ms)`,
      );
    });

    next();
  }
}
