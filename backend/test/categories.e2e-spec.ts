import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, resetDb, newUser } from './utils';

interface Cat {
  id: number;
  name: string;
  color: string;
  note_count: number;
}

describe('Categories (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => app.close());
  beforeEach(async () => resetDb(app));

  it('a new user gets the four default categories with exact colors', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const cats: Cat[] = (await agent.get('/api/categories/').expect(200)).body;
    const colors = Object.fromEntries(cats.map((c) => [c.name, c.color]));
    expect(colors).toEqual({
      'Random Thoughts': '#EF9C66',
      School: '#FCDC94',
      Personal: '#78ABA8',
      Drama: '#C8CFA0',
    });
  });

  it('the category list is owner-scoped and counted', async () => {
    const { agent: alice } = await newUser(app, 'alice@example.com');
    const aliceCats: Cat[] = (await alice.get('/api/categories/')).body;
    const school = aliceCats.find((c) => c.name === 'School')!;
    await alice.post('/api/notes/').send({ title: 'a', category: school.id });
    await alice.post('/api/notes/').send({ title: 'b', category: school.id });

    // Another user's note must not leak into our counts.
    const { agent: bob } = await newUser(app, 'bob@example.com');
    const bobCats: Cat[] = (await bob.get('/api/categories/')).body;
    await bob.post('/api/notes/').send({ title: 'x', category: bobCats[0].id });

    const res = await alice.get('/api/categories/').expect(200);
    expect(res.body).toHaveLength(4);
    const counts = Object.fromEntries(res.body.map((c: Cat) => [c.name, c.note_count]));
    expect(counts.School).toBe(2);
    expect(counts.Personal).toBe(0);
  });
});
