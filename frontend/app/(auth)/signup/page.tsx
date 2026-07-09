'use client';

import { AuthForm } from '@/components/AuthForm';
import { useRegister } from '@/lib/queries';

export default function SignUpPage() {
  const mutation = useRegister();
  return (
    <AuthForm
      heading="Yay, New Friend!"
      submitLabel="Sign Up"
      mutation={mutation}
      altHref="/login"
      altLabel="We're already friends!"
    />
  );
}
