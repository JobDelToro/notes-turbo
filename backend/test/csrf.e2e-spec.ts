import { INestApplication } from '@nestjs/common';
import { createApp, resetDb, newUser } from './utils';

// The CSRF origin check backs up SameSite: a state-changing request whose Origin
// is present and foreign is rejected; same-origin, no-origin (non-browser), and
// safe methods pass. FRONTEND_ORIGIN defaults to http://localhost:3000 in tests.
describe('CSRF origin check (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => app.close());
  beforeEach(async () => resetDb(app));

  it('blocks a state-changing request from a foreign origin', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent
      .post('/api/notes/')
      .set('Origin', 'http://evil.example')
      .send({ title: 'x' })
      .expect(403);
  });

  it('allows a state-changing request from the app origin', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent
      .post('/api/notes/')
      .set('Origin', 'http://localhost:3000')
      .send({ title: 'ok' })
      .expect(201);
  });

  it('allows a state-changing request with no Origin (non-browser client)', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent.post('/api/notes/').send({ title: 'ok' }).expect(201);
  });

  it('allows a safe GET from any origin', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent.get('/api/notes/').set('Origin', 'http://evil.example').expect(200);
  });
});
