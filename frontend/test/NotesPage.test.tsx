import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesPage from '@/app/(app)/notes/page';
import { routerMock } from './utils';

const useMeMock = vi.fn();
const refetch = vi.fn();

vi.mock('next/navigation', () => ({ useRouter: () => routerMock }));

vi.mock('@/lib/queries', () => ({
  useMe: () => useMeMock(),
}));

// Keep the page test focused on the auth guard, not the workspace internals.
vi.mock('@/components/NotesWorkspace', () => ({
  NotesWorkspace: () => <div data-testid="workspace">workspace</div>,
}));

/** Build a `useMe`-shaped result; overrides fill in the interesting fields. */
function meResult(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch,
    ...overrides,
  };
}

describe('NotesPage auth guard', () => {
  beforeEach(() => {
    useMeMock.mockReset();
    refetch.mockReset();
    routerMock.replace.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects to /login when the user is genuinely unauthenticated (null)', () => {
    useMeMock.mockReturnValue(meResult({ data: null }));

    render(<NotesPage />);

    expect(routerMock.replace).toHaveBeenCalledWith('/login');
    // Never flashes the protected workspace.
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
  });

  it('does NOT redirect on a transient (non-401) error — shows a retryable card', async () => {
    useMeMock.mockReturnValue(meResult({ isError: true }));

    render(<NotesPage />);

    // A transient failure must not log a valid session out.
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(screen.queryByTestId('workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the workspace for an authenticated user', () => {
    useMeMock.mockReturnValue(meResult({ data: { id: 1, email: 'a@b.co' } }));

    render(<NotesPage />);

    expect(screen.getByTestId('workspace')).toBeInTheDocument();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
