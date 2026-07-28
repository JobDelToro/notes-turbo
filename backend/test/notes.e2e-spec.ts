import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, resetDb, newUser } from './utils';

interface Cat {
  id: number;
  name: string;
}
interface NoteBody {
  id: number;
  title: string;
}

describe('Notes (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createApp();
    server = app.getHttpServer();
  });
  afterAll(async () => app.close());
  beforeEach(async () => resetDb(app));

  const catsOf = async (agent: ReturnType<typeof request.agent>): Promise<Cat[]> =>
    (await agent.get('/api/categories/')).body;

  it('create note returns the category color', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const school = (await catsOf(agent)).find((c) => c.name === 'School')!;
    const res = await agent
      .post('/api/notes/')
      .send({ title: 'Homework', content: 'Math ch.3', category: school.id })
      .expect(201);
    expect(res.body.title).toBe('Homework');
    expect(res.body.category_detail.color).toBe('#FCDC94');
  });

  it('list returns only the requester\'s notes', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const { agent: bob } = await newUser(app, 'bob@example.com');
    await alice.post('/api/notes/').send({ title: 'mine' }).expect(201);
    await bob.post('/api/notes/').send({ title: 'theirs' }).expect(201);
    const res = await alice.get('/api/notes/').expect(200);
    expect(res.body.results.map((n: NoteBody) => n.title)).toEqual(['mine']);
  });

  it('filters by category', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const cats = await catsOf(agent);
    const school = cats.find((c) => c.name === 'School')!;
    const personal = cats.find((c) => c.name === 'Personal')!;
    await agent.post('/api/notes/').send({ title: 's', category: school.id });
    await agent.post('/api/notes/').send({ title: 'p', category: personal.id });
    const res = await agent.get(`/api/notes/?category=${school.id}`).expect(200);
    expect(res.body.results.map((n: NoteBody) => n.title)).toEqual(['s']);
  });

  it('an invalid category param is a 400, not a 500', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent.get('/api/notes/?category=abc').expect(400);
  });

  it('patch autosaves content', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const note: NoteBody = (await agent.post('/api/notes/').send({ title: 'draft' })).body;
    const res = await agent
      .patch(`/api/notes/${note.id}/`)
      .send({ content: 'pour your heart out' })
      .expect(200);
    expect(res.body.content).toBe('pour your heart out');
  });

  it('deletes a note', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const note: NoteBody = (await agent.post('/api/notes/').send({ title: 'x' })).body;
    await agent.delete(`/api/notes/${note.id}/`).expect(204);
    await agent.get(`/api/notes/${note.id}/`).expect(404);
  });

  it('notes require authentication', async () => {
    await request(server).get('/api/notes/').expect(401);
  });

  // --- Ownership isolation: another user's note must appear not to exist (404) ---

  it('cannot read another user\'s note', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const { agent: bob } = await newUser(app, 'bob@example.com');
    const note: NoteBody = (await bob.post('/api/notes/').send({ title: 'secret' })).body;
    await alice.get(`/api/notes/${note.id}/`).expect(404);
  });

  it('cannot update another user\'s note', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const { agent: bob } = await newUser(app, 'bob@example.com');
    const note: NoteBody = (await bob.post('/api/notes/').send({ title: 'secret' })).body;
    await alice.patch(`/api/notes/${note.id}/`).send({ title: 'hacked' }).expect(404);
  });

  it('cannot delete another user\'s note', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const { agent: bob } = await newUser(app, 'bob@example.com');
    const note: NoteBody = (await bob.post('/api/notes/').send({ title: 'secret' })).body;
    await alice.delete(`/api/notes/${note.id}/`).expect(404);
  });

  it('cannot assign another user\'s category', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const { agent: bob } = await newUser(app, 'bob@example.com');
    const bobCats = await catsOf(bob);
    await alice
      .post('/api/notes/')
      .send({ title: 'x', category: bobCats[0].id })
      .expect(400);
  });
});
