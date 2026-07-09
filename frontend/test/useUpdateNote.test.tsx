import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpdateNote, queryKeys } from '@/lib/queries';
import type { Note } from '@/lib/schemas';
import { makeNote } from './fixtures';

// Exercise the REAL hook's optimistic-update + latest-wins machinery; only the
// network call is stubbed so we can control resolution order.
//
// Note: the error-path branches of onError (rollback on a transient error, and
// the 404 "don't resurrect a deleted note" guard) are verified in the live E2E
// rather than here — a React Query v5 mutation error surfaces as an unhandled
// rejection in the Vitest runner regardless of how the caller consumes it, which
// would make an error-path unit test flaky. The success paths below are stable.
const { updateNoteMock } = vi.hoisted(() => ({ updateNoteMock: vi.fn() }));
vi.mock('@/lib/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/endpoints')>();
  return { ...actual, updateNote: (id: number, patch: unknown) => updateNoteMock(id, patch) };
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup(initial: Note[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(queryKeys.notes(null), initial);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateNote(), { wrapper });
  const list = () => client.getQueryData<Note[]>(queryKeys.notes(null));
  return { client, result, list };
}

beforeEach(() => updateNoteMock.mockReset());

describe('useUpdateNote — optimistic cache mechanics', () => {
  it('applies the patch optimistically, then reconciles with the server', async () => {
    const { result, list } = setup([makeNote({ id: 1, title: 'old' })]);
    const d = deferred<Note>();
    updateNoteMock.mockReturnValue(d.promise);

    result.current.mutate({ id: 1, patch: { title: 'new' } });
    await waitFor(() => expect(list()?.[0].title).toBe('new')); // optimistic, pre-server

    d.resolve(makeNote({ id: 1, title: 'new' }));
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(list()?.[0].title).toBe('new'); // reconciled with the server row
  });

  it('latest-wins: a stale older success does not clobber a newer edit', async () => {
    const { result, list } = setup([makeNote({ id: 1, title: 'v0' })]);
    const d1 = deferred<Note>();
    const d2 = deferred<Note>();
    updateNoteMock.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise);

    result.current.mutate({ id: 1, patch: { title: 'v1' } });
    await waitFor(() => expect(list()?.[0].title).toBe('v1'));
    result.current.mutate({ id: 1, patch: { title: 'v2' } });
    await waitFor(() => expect(list()?.[0].title).toBe('v2')); // newest optimistic wins

    // Resolve the NEWER mutation first, then the older (stale) one.
    d2.resolve(makeNote({ id: 1, title: 'v2' }));
    d1.resolve(makeNote({ id: 1, title: 'v1' }));
    await waitFor(() => expect(updateNoteMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(list()?.[0].title).toBe('v2')); // stale success skipped
  });
});
