import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { configureApp } from './setup';

async function bootstrap(): Promise<void> {
  // Ensure the local sql.js file has a home when running without Postgres.
  if (!process.env.DATABASE_URL) {
    try {
      mkdirSync('data', { recursive: true });
    } catch {
      /* ignore */
    }
  }

  const app = await NestFactory.create(AppModule);

  // Only trust proxy headers (X-Forwarded-For, used for the client IP behind a
  // reverse proxy) when explicitly configured, so a direct deploy can't be
  // spoofed to evade rate limits. Set TRUST_PROXY to a hop count or "true".
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    const value = /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true';
    app.getHttpAdapter().getInstance().set('trust proxy', value);
  }

  configureApp(app);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 8000);
  await app.listen(port);
  new Logger('Bootstrap').log(`Notes API listening on http://localhost:${port}/api`);
}

void bootstrap();
