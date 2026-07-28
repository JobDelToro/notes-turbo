import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, newUser } from './utils';

// These specs use the real ThrottlerGuard (opted in), one fresh app per test so
// the per-route counters start clean.
describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeEach(async () => {
    delete process.env.LLM_API_KEY;
    app = await createApp({ throttle: true });
    server = app.getHttpServer();
  });
  afterEach(async () => app.close());

  it('login is rate limited to 10/min', async () => {
    const creds = { email: 'nobody@example.com', password: 'wrong-password' };
    for (let i = 0; i < 10; i++) {
      await request(server).post('/api/auth/login').send(creds);
    }
    await request(server).post('/api/auth/login').send(creds).expect(429);
  });

  it('the AI endpoints are rate limited to 20/min', async () => {
    // No key → deterministic heuristic path, no network.
    const { agent } = await newUser(app, 'alice@example.com');
    for (let i = 0; i < 20; i++) {
      await agent.post('/api/ai/categorize').send({ content: 'note' }).expect(200);
    }
    await agent.post('/api/ai/categorize').send({ content: 'note' }).expect(429);
  });

  it('all auth routes share one 10/min counter (scoped, like Django)', async () => {
    const bad = { email: 'nobody@example.com', password: 'wrong-password' };
    for (let i = 0; i < 5; i++) await request(server).post('/api/auth/login').send(bad);
    for (let i = 0; i < 5; i++) await request(server).post('/api/auth/refresh');
    // 11th auth request in the window (any auth route) is throttled.
    await request(server).post('/api/auth/login').send(bad).expect(429);
  });

  it('all AI routes share one 20/min counter (scoped, like Django)', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    for (let i = 0; i < 10; i++) await agent.post('/api/ai/categorize').send({ content: 'n' }).expect(200);
    for (let i = 0; i < 10; i++) await agent.post('/api/ai/summarize').send({ content: 'n' }).expect(200);
    await agent.post('/api/ai/summarize').send({ content: 'n' }).expect(429);
  });
});
