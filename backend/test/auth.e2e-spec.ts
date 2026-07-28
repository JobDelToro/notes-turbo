import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, resetDb, newUser, cookieValue, cookieHeader, PASSWORD } from './utils';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    server = app.getHttpServer();
  });
  afterAll(async () => app.close());
  beforeEach(async () => resetDb(app));

  it('register creates the user, seeds four categories, and sets httpOnly cookies', async () => {
    const { agent, res } = await newUser(app, 'new@example.com');
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@example.com');
    expect(cookieHeader(res, 'access_token')).toMatch(/HttpOnly/i);
    expect(cookieValue(res, 'refresh_token')).toBeTruthy();

    const cats = await agent.get('/api/categories/').expect(200);
    expect(cats.body.map((c: { name: string }) => c.name).sort()).toEqual(
      ['Drama', 'Personal', 'Random Thoughts', 'School'].sort(),
    );
  });

  it('register rejects a duplicate email (case-insensitive)', async () => {
    await newUser(app, 'dupe@example.com');
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'DUPE@example.com', password: PASSWORD })
      .expect(400);
  });

  it('register rejects a weak password', async () => {
    await request(server)
      .post('/api/auth/register')
      .send({ email: 'weak@example.com', password: '123' })
      .expect(400);
  });

  it('login sets cookies and /me reads them', async () => {
    await newUser(app, 'alice@example.com');
    const agent = request.agent(server);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: PASSWORD })
      .expect(200);
    expect(cookieValue(login, 'access_token')).toBeTruthy();

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.email).toBe('alice@example.com');
  });

  it('login rejects a bad password', async () => {
    await newUser(app, 'alice@example.com');
    await request(server)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'totally-wrong' })
      .expect(401);
  });

  it('/me requires authentication', async () => {
    await request(server).get('/api/auth/me').expect(401);
  });

  it('logout clears the cookies', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const res = await agent.post('/api/auth/logout').expect(205);
    // Cleared cookies come back with an empty value.
    expect(cookieValue(res, 'access_token')).toBe('');
    expect(cookieValue(res, 'refresh_token')).toBe('');
  });

  it('logout blacklists the refresh token so it cannot be replayed', async () => {
    await newUser(app, 'alice@example.com');
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: PASSWORD })
      .expect(200);
    const refresh = cookieValue(login, 'refresh_token');

    await request(server)
      .post('/api/auth/logout')
      .set('Cookie', [`refresh_token=${refresh}`])
      .expect(205);

    await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${refresh}`])
      .expect(401);
  });

  it('refresh without a cookie is unauthorized', async () => {
    await request(server).post('/api/auth/refresh').expect(401);
  });

  it('refresh rotates the token and invalidates the old one', async () => {
    await newUser(app, 'alice@example.com');
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: PASSWORD })
      .expect(200);
    const oldRefresh = cookieValue(login, 'refresh_token');

    const first = await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${oldRefresh}`])
      .expect(200);
    const newRefresh = cookieValue(first, 'refresh_token');
    expect(newRefresh).toBeTruthy();
    expect(newRefresh).not.toBe(oldRefresh);

    // The rotated-away token is blacklisted.
    await request(server)
      .post('/api/auth/refresh')
      .set('Cookie', [`refresh_token=${oldRefresh}`])
      .expect(401);
  });
});
