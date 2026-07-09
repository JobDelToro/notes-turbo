/**
 * Test helpers: a `renderWithClient` that wraps UI in a fresh QueryClient with
 * retries disabled, plus a reusable router mock.
 */
import type { ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithClient(ui: ReactElement, options?: RenderOptions) {
  const client = createTestQueryClient();
  return {
    client,
    ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, options),
  };
}

/** A shared router mock; assign into `vi.mock('next/navigation', ...)`. */
export const routerMock = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};
