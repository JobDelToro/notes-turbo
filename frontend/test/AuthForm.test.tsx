import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UseMutationResult } from '@tanstack/react-query';
import { AuthForm } from '@/components/AuthForm';
import type { User } from '@/lib/schemas';
import type { ApiError } from '@/lib/api';
import { routerMock } from './utils';

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

type AuthMutation = UseMutationResult<User, ApiError, { email: string; password: string }>;

function mockMutation(overrides: Partial<AuthMutation> = {}): AuthMutation {
  return {
    mutate: vi.fn(),
    isPending: false,
    error: null,
    ...overrides,
  } as unknown as AuthMutation;
}

/** The two screens differ only in copy; these fill the shared required props. */
const baseProps = {
  subheading: 'A supporting line.',
  altPrompt: 'New here?',
} as const;

describe('AuthForm', () => {
  beforeEach(() => {
    routerMock.push.mockClear();
  });

  it('shows a validation error for a bad email and does not submit', async () => {
    const mutation = mockMutation();
    render(
      <AuthForm
        {...baseProps}
        heading="Create your account"
        submitLabel="Sign up"
        mutation={mutation}
        altHref="/login"
        altLabel="Log in"
      />,
    );

    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it('shows a validation error for a short password', async () => {
    const mutation = mockMutation();
    render(
      <AuthForm
        {...baseProps}
        heading="Welcome back"
        submitLabel="Log in"
        mutation={mutation}
        altHref="/signup"
        altLabel="Create an account"
      />,
    );

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mutation.mutate).not.toHaveBeenCalled();
  });

  it('submits valid credentials to the mutation', async () => {
    const mutation = mockMutation();
    render(
      <AuthForm
        {...baseProps}
        heading="Create your account"
        submitLabel="Sign up"
        mutation={mutation}
        altHref="/login"
        altLabel="Log in"
      />,
    );

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'supersecret');
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(mutation.mutate).toHaveBeenCalledWith(
      { email: 'user@example.com', password: 'supersecret' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('surfaces a server error message', () => {
    const mutation = mockMutation({
      error: { message: 'Invalid email or password.' } as ApiError,
    });
    render(
      <AuthForm
        {...baseProps}
        heading="Welcome back"
        submitLabel="Log in"
        mutation={mutation}
        altHref="/signup"
        altLabel="Create an account"
      />,
    );
    expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('toggles password visibility with the eye button', async () => {
    render(
      <AuthForm
        {...baseProps}
        heading="Create your account"
        submitLabel="Sign up"
        mutation={mockMutation()}
        altHref="/login"
        altLabel="Log in"
      />,
    );
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.type).toBe('password');
    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(password.type).toBe('text');
  });
});
