import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNotes } from '@/lib/endpoints';
import { notes } from './fixtures';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getNotes', () => {
  it('parses the DRF page envelope and returns just the results array', async () => {
    const page = { count: notes.length, next: null, previous: null, results: notes };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(page));

    const result = await getNotes(null);

    // Callers keep receiving `Note[]`, not the envelope.
    expect(result).toEqual(notes);
  });

  it('appends the category query and still unwraps results', async () => {
    const page = { count: 1, next: null, previous: null, results: [notes[0]] };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(page));

    const result = await getNotes(2);

    expect(result).toEqual([notes[0]]);
    const url = fetchSpy.mock.calls[0]?.[0];
    expect(String(url)).toContain('/notes/?category=2');
  });

  it('rejects a bare array (old contract) as an invalid response', async () => {
    // The endpoint used to return a bare array; that no longer validates.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(notes));

    await expect(getNotes(null)).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
