import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { createApp, resetDb, newUser, cookieValue, PASSWORD } from './utils';
import { AuthService } from '../src/auth/auth.service';
import { AiService } from '../src/ai/ai.service';
import { RevokedToken } from '../src/entities/revoked-token.entity';

describe('Hardening (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    server = app.getHttpServer();
  });
  afterAll(async () => app.close());
  beforeEach(async () => {
    await resetDb(app);
    delete process.env.LLM_API_KEY;
  });
  afterEach(() => delete process.env.LLM_API_KEY);

  it('register rejects a common password', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'c@example.com', password: 'iloveyou' })
      .expect(400);
  });

  it('register rejects a password too similar to the email', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'johnsmith@example.com', password: 'johnsmith99' })
      .expect(400);
  });

  it('a refresh token cannot be rotated twice, even concurrently', async () => {
    await newUser(app, 'alice@example.com');
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: PASSWORD })
      .expect(200);
    const r0 = cookieValue(login, 'refresh_token');
    const [a, b] = await Promise.all([
      request(server).post('/api/auth/refresh').set('Cookie', [`refresh_token=${r0}`]),
      request(server).post('/api/auth/refresh').set('Cookie', [`refresh_token=${r0}`]),
    ]);
    // Exactly one succeeds; the other loses the atomic jti claim.
    expect([a.status, b.status].sort()).toEqual([200, 401]);
  });

  it('purges expired revoked tokens but keeps live ones', async () => {
    const auth = app.get(AuthService);
    const revoked = app.get<Repository<RevokedToken>>(getRepositoryToken(RevokedToken));
    const now = 1_000_000;
    await revoked.insert({ jti: 'expired', expiresAt: now - 100 });
    await revoked.insert({ jti: 'live', expiresAt: now + 1000 });
    expect(await auth.purgeExpiredTokens(now)).toBe(1);
    expect(await revoked.existsBy({ jti: 'expired' })).toBe(false);
    expect(await revoked.existsBy({ jti: 'live' })).toBe(true);
  });

  it('a non-integer note id is a 404, not a 400', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent.get('/api/notes/abc').expect(404);
    await agent.patch('/api/notes/abc').send({ title: 'x' }).expect(404);
    await agent.delete('/api/notes/abc').expect(404);
  });

  it('memoizes the LLM client for a given api key', () => {
    process.env.LLM_API_KEY = 'test-key';
    const ai = app.get(AiService);
    expect(ai.createClient()).toBe(ai.createClient());
  });
});
