'use client';

import { AuthForm } from '@/components/AuthForm';
import { useRegister } from '@/lib/queries';

export default function SignUpPage() {
  const mutation = useRegister();
  return (
    <AuthForm
      heading="Create your account"
      subheading="Capture ideas, organize them by color, and let AI lend a hand. It's free."
      submitLabel="Sign up"
      mutation={mutation}
      altPrompt="Already have an account?"
      altHref="/login"
      altLabel="Log in"
    />
  );
}
