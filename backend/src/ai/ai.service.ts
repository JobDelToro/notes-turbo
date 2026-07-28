import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { CategoryMini } from '../categories/categories.service';
import { heuristicCategory } from './keywords';

export interface CategorizeResult {
  available: boolean;
  category_id: number | null;
  category_name: string | null;
  source: 'llm' | 'heuristic' | null;
}

export interface SummarizeResult {
  available: boolean;
  summary: string;
  source: 'llm' | 'heuristic' | null;
}

/** The minimal slice of the OpenAI client we use — small enough to fake in tests. */
export interface ChatClient {
  chat: {
    completions: {
      create(args: {
        model: string;
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

const apiKey = (): string => process.env.LLM_API_KEY ?? '';
const baseURL = (): string => process.env.LLM_BASE_URL ?? 'https://api.groq.com/openai/v1';
const classifierModel = (): string => process.env.LLM_CLASSIFIER_MODEL ?? 'llama-3.1-8b-instant';
const generatorModel = (): string => process.env.LLM_GENERATOR_MODEL ?? 'llama-3.3-70b-versatile';

/**
 * AI assist: an OpenAI-compatible seam (Groq by default) with a deterministic
 * heuristic fallback. With no key configured, or on any provider error/timeout,
 * the heuristic answers instead, so the endpoints never fail the request.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger('AiService');
  // Memoized client, rebuilt only if the API key changes (it is static per process).
  private cached?: { key: string; client: ChatClient | null };

  /** Build (once) the LLM client, or null when AI is not configured. Overridable in tests. */
  createClient(): ChatClient | null {
    const key = apiKey();
    if (this.cached && this.cached.key === key) return this.cached.client;

    let client: ChatClient | null = null;
    if (key) {
      try {
        // 12s ceiling so a slow provider can't tie up a worker (SDK default is 600s);
        // no SDK retry — the heuristic IS the fallback.
        client = new OpenAI({
          apiKey: key,
          baseURL: baseURL(),
          timeout: 12_000,
          maxRetries: 0,
        }) as unknown as ChatClient;
      } catch {
        this.logger.error('Could not initialize the LLM client');
        client = null;
      }
    }
    this.cached = { key, client };
    return client;
  }

  async categorize(content: string, categories: CategoryMini[]): Promise<CategorizeResult> {
    const hasKey = Boolean(apiKey());
    if (!content || !content.trim()) {
      return { available: hasKey, category_id: null, category_name: null, source: null };
    }

    const client = this.createClient();
    if (client) {
      try {
        const names = categories.map((c) => c.name);
        const prompt =
          `Classify the note into exactly one of these categories: ${names.join(', ')}.\n` +
          `Reply with ONLY the category name, nothing else.\n\nNote:\n${content.slice(0, 2000)}`;
        const completion = await client.chat.completions.create({
          model: classifierModel(),
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: 16,
        });
        const answer = (completion.choices[0]?.message.content ?? '').trim().toLowerCase();
        const match =
          categories.find((c) => c.name.toLowerCase() === answer) ??
          categories.find((c) => answer.includes(c.name.toLowerCase()));
        if (match) {
          return {
            available: true,
            source: 'llm',
            category_id: match.id,
            category_name: match.name,
          };
        }
      } catch {
        this.logger.error('LLM categorize failed; using heuristic fallback');
      }
    }

    const match = heuristicCategory(content, categories);
    return {
      available: hasKey,
      source: 'heuristic',
      category_id: match?.id ?? null,
      category_name: match?.name ?? null,
    };
  }

  async summarize(content: string): Promise<SummarizeResult> {
    const hasKey = Boolean(apiKey());
    if (!content || !content.trim()) {
      return { available: hasKey, summary: '', source: null };
    }

    const client = this.createClient();
    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: generatorModel(),
          messages: [
            {
              role: 'system',
              content: 'You summarize personal notes in one or two concise sentences.',
            },
            { role: 'user', content: content.slice(0, 4000) },
          ],
          temperature: 0.3,
          max_tokens: 160,
        });
        const summary = (completion.choices[0]?.message.content ?? '').trim();
        return { available: true, source: 'llm', summary };
      } catch {
        this.logger.error('LLM summarize failed; using heuristic fallback');
      }
    }

    const sentences = content.trim().split(/(?<=[.!?])\s+/);
    const summary = sentences.slice(0, 2).join(' ').slice(0, 280);
    return { available: hasKey, source: 'heuristic', summary };
  }
}
