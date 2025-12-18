import { Request, Response, NextFunction } from 'express';
import { RateLimiter } from './rateLimiter.js';
import { Monitoring } from './monitoring.js';

export function rateLimitMiddleware(rateLimiter: RateLimiter) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.ip || 'unknown';
    const { allowed, resetTime } = rateLimiter.checkLimit(identifier);

    if (!allowed) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', '10');
    res.setHeader('X-RateLimit-Remaining', '9');
    res.setHeader('X-RateLimit-Reset', resetTime.toString());
    next();
  };
}

export function monitoringMiddleware(monitoring: Monitoring) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      monitoring.recordRequest({
        responseTime,
        timestamp: startTime,
        endpoint: req.path,
        statusCode: res.statusCode,
      });
    });

    next();
  };
}

