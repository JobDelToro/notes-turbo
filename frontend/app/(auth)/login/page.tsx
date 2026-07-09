'use client';

import { AuthForm } from '@/components/AuthForm';
import { useLogin } from '@/lib/queries';

export default function LoginPage() {
  const mutation = useLogin();
  return (
    <AuthForm
      heading="Yay, You're Back!"
      submitLabel="Login"
      mutation={mutation}
      altHref="/signup"
      altLabel="Oops! I've never been here before"
    />
  );
}
