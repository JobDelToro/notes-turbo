import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiFetch, ApiError } from '@/lib/api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('sends credentials and parses the response with the schema', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 1, name: 'ok' }));

    const schema = z.object({ id: z.number(), name: z.string() });
    const result = await apiFetch('/thing/', { schema });

    expect(result).toEqual({ id: 1, name: 'ok' });
    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.credentials).toBe('include');
  });

  it('throws an ApiError carrying the backend envelope message and status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'not_authenticated', message: 'Auth required.' } }, 401),
    );

    await expect(apiFetch('/auth/me')).rejects.toMatchObject({
      status: 401,
      code: 'not_authenticated',
      message: 'Auth required.',
    });
    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns undefined for empty 205/204 responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 205 }));
    await expect(apiFetch('/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('flags 401 responses via isUnauthorized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'x', message: 'nope' } }, 401),
    );
    try {
      await apiFetch('/auth/me');
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).isUnauthorized).toBe(true);
    }
  });

  it('wraps network failures in an ApiError with status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('failed to fetch'));
    await expect(apiFetch('/thing/')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    });
  });
});

describe('apiFetch — silent refresh on 401', () => {
  const schema = z.object({ ok: z.boolean() });

  it('refreshes the session on a 401 and replays the request once', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'x', message: 'expired' } }, 401))
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ ok: true })); // replayed request

    const result = await apiFetch('/notes/', { schema });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('/auth/refresh');
    expect(fetchSpy.mock.calls[1]?.[1]?.method).toBe('POST');
  });

  it('replays a mutating request after refresh (a 401 was never processed)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'x', message: 'expired' } }, 401))
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await apiFetch('/notes/9/', { method: 'PATCH', body: { title: 'x' }, schema });

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    // The replay carries the original method + body.
    expect(fetchSpy.mock.calls[2]?.[1]?.method).toBe('PATCH');
  });

  it('gives up and surfaces the 401 when the refresh also fails', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'x', message: 'expired' } }, 401))
      .mockResolvedValueOnce(new Response(null, { status: 401 })); // /auth/refresh fails

    await expect(apiFetch('/notes/', { schema })).rejects.toMatchObject({ status: 401 });
    // Original request + one refresh attempt, then no replay.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('never tries to refresh the auth endpoints themselves (no loop)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ error: { code: 'bad', message: 'nope' } }, 401));

    await expect(
      apiFetch('/auth/login', { method: 'POST', body: { email: 'a', password: 'b' }, schema }),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent 401s into a single refresh (rotation-safe)', async () => {
    let refreshCalls = 0;
    let releaseRefresh!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });
    const firstHit = new Set<string>();

    vi.spyOn(globalThis, 'fetch').mockImplementation((async (url: string) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) {
        refreshCalls += 1;
        await gate; // stay in-flight until both requests have queued behind it
        return new Response(null, { status: 200 });
      }
      if (!firstHit.has(u)) {
        firstHit.add(u);
        return jsonResponse({ error: { code: 'x', message: 'expired' } }, 401);
      }
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch);

    const p1 = apiFetch('/notes/', { schema });
    const p2 = apiFetch('/categories/', { schema });
    // Let both requests 401 and enter the shared refresh before releasing it.
    await new Promise((r) => setTimeout(r, 0));
    releaseRefresh();

    await expect(Promise.all([p1, p2])).resolves.toEqual([{ ok: true }, { ok: true }]);
    expect(refreshCalls).toBe(1);
  });
});
