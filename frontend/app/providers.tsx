'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';

/**
 * App-wide client providers. The QueryClient is created once per browser
 * session via `useState` (never at module scope) so state is not shared
 * across requests during SSR.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't spam the API on window focus for a note app.
            refetchOnWindowFocus: false,
            staleTime: 10_000,
            retry: (failureCount, error) => {
              // Never retry auth failures or client errors; retry transient ones once.
              if (error instanceof ApiError && error.status < 500) return false;
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
