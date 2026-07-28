import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp, resetDb, newUser } from './utils';
import { AiService, ChatClient } from '../src/ai/ai.service';

describe('AI assist (e2e)', () => {
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
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.LLM_API_KEY;
  });

  it('categorize falls back to the heuristic without a key', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const res = await agent
      .post('/api/ai/categorize')
      .send({ content: 'I have an exam and homework due for class tomorrow' })
      .expect(200);
    expect(res.body.available).toBe(false);
    expect(res.body.source).toBe('heuristic');
    expect(res.body.category_name).toBe('School');
  });

  it('summarize falls back to the heuristic without a key', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    const res = await agent
      .post('/api/ai/summarize')
      .send({ content: 'First sentence here. Second sentence here. Third one.' })
      .expect(200);
    expect(res.body.summary.startsWith('First sentence here.')).toBe(true);
  });

  it('rejects non-string content with a 400 (not a 500)', async () => {
    const { agent } = await newUser(app, 'alice@example.com');
    await agent.post('/api/ai/categorize').send({ content: ['a', 'b'] }).expect(400);
  });

  it('categorize uses the LLM when configured', async () => {
    process.env.LLM_API_KEY = 'test-key';
    const ai = app.get(AiService);
    const fake: ChatClient = {
      chat: { completions: { create: async () => ({ choices: [{ message: { content: 'Drama' } }] }) } },
    };
    jest.spyOn(ai, 'createClient').mockReturnValue(fake);

    const { agent } = await newUser(app, 'alice@example.com');
    const res = await agent
      .post('/api/ai/categorize')
      .send({ content: 'we had a huge fight' })
      .expect(200);
    expect(res.body.source).toBe('llm');
    expect(res.body.available).toBe(true);
    expect(res.body.category_name).toBe('Drama');
  });

  it('summarize uses the generator model when configured', async () => {
    process.env.LLM_API_KEY = 'test-key';
    process.env.LLM_GENERATOR_MODEL = 'llama-3.3-70b-versatile';
    const captured: { model?: string } = {};
    const ai = app.get(AiService);
    const fake: ChatClient = {
      chat: {
        completions: {
          create: async (args) => {
            captured.model = args.model;
            return { choices: [{ message: { content: 'A concise summary.' } }] };
          },
        },
      },
    };
    jest.spyOn(ai, 'createClient').mockReturnValue(fake);

    const { agent } = await newUser(app, 'alice@example.com');
    const res = await agent
      .post('/api/ai/summarize')
      .send({ content: 'A long note that needs summarizing.' })
      .expect(200);
    expect(res.body.source).toBe('llm');
    expect(res.body.summary).toBe('A concise summary.');
    expect(captured.model).toBe('llama-3.3-70b-versatile');
  });

  it('AI endpoints require authentication', async () => {
    await request(server).post('/api/ai/categorize').send({ content: 'x' }).expect(401);
    await request(server).post('/api/ai/summarize').send({ content: 'x' }).expect(401);
  });
});
