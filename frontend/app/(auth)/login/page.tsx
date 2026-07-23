'use client';

import { AuthForm } from '@/components/AuthForm';
import { useLogin } from '@/lib/queries';

export default function LoginPage() {
  const mutation = useLogin();
  return (
    <AuthForm
      heading="Welcome back"
      subheading="Your notes are right where you left them. Log in to pick up the thread."
      submitLabel="Log in"
      mutation={mutation}
      altPrompt="New here?"
      altHref="/signup"
      altLabel="Create an account"
    />
  );
}
