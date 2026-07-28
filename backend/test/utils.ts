import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { ScopedThrottlerGuard } from '../src/common/scoped-throttler.guard';

export const PASSWORD = 'Sup3r-secret-123';

/**
 * Build an app backed by an in-memory sql.js database. By default the rate-limit
 * guard is stubbed out so functional tests are not throttled; the throttle spec
 * opts back in with `{ throttle: true }`.
 */
export async function createApp(opts: { throttle?: boolean } = {}): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (!opts.throttle) {
    builder.overrideGuard(ScopedThrottlerGuard).useValue({ canActivate: () => true });
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** Drop + recreate the schema so each test starts from a clean database. */
export async function resetDb(app: INestApplication): Promise<void> {
  await app.get(DataSource).synchronize(true);
}

/** Register a user and return a cookie-persisting agent authenticated as them. */
export async function newUser(
  app: INestApplication,
  email: string,
  password: string = PASSWORD,
): Promise<{ agent: ReturnType<typeof request.agent>; res: request.Response }> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/auth/register').send({ email, password });
  if (res.status !== 201) {
    throw new Error(`register failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { agent, res };
}

/** Pull a single cookie's value out of a response's Set-Cookie header. */
export function cookieValue(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  if (!raw) return undefined;
  const found = raw.find((c) => c.startsWith(`${name}=`));
  return found ? found.split(';')[0].slice(name.length + 1) : undefined;
}

/** The raw Set-Cookie entry (to assert flags like HttpOnly). */
export function cookieHeader(res: request.Response, name: string): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${name}=`));
}
