'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe } from '@/lib/queries';
import { NotesWorkspace } from '@/components/NotesWorkspace';
import { BobaCup } from '@/components/illustrations/BobaCup';

/**
 * Notes route. Auth is enforced client-side from `/auth/me` (cookies are
 * httpOnly, so the token can't be read directly).
 *
 * A 401 resolves `me` to `null` — that is a genuine "logged out" and we redirect
 * to /login. A non-401 failure (500/network) is *not* a logout signal: showing a
 * retryable error beats bouncing a valid session to the login screen. While auth
 * resolves we show a light placeholder.
 */
export default function NotesPage() {
  const router = useRouter();
  const { data: user, isLoading, isError, refetch } = useMe();

  useEffect(() => {
    // Only redirect on a genuine unauthenticated resolution (`null`), never on a
    // transient error — that is handled by the retryable error card below.
    if (!isLoading && user === null) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-4">
        <div className="max-w-sm rounded-[11px] border border-gold/40 bg-surface/70 p-6 text-center shadow-[var(--shadow-card)]">
          <p className="text-sm text-ink">We couldn&apos;t load your session.</p>
          <p className="mt-1 text-xs text-ink/60">
            This is usually temporary. Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-full border border-gold px-4 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Redirecting (`null`) or still resolving — never flash protected content.
  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-cream">
        <BobaCup className="h-24 w-20 animate-pulse opacity-60" />
      </div>
    );
  }

  return <NotesWorkspace />;
}
