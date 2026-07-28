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
