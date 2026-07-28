import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Shared app wiring, applied identically in `main.ts` and in the e2e tests, so
 * the tested app and the running app behave the same: the `/api` prefix, the
 * cookie parser, the CSRF origin check, the validating DTO pipe, and the
 * error-envelope filter.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // CSRF defense that needs no frontend change: reject a state-changing request
  // whose Origin is present and is not our frontend. Same-origin requests (the
  // real app) and non-browser callers (no Origin) pass. This backs up SameSite,
  // and holds even when SameSite=None is configured for a cross-domain deploy.
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (origin && UNSAFE_METHODS.has(req.method) && origin !== allowedOrigin) {
      res
        .status(403)
        .json({ error: { code: 'permission_denied', message: 'Cross-origin request blocked.' } });
      return;
    }
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
