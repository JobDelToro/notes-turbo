import { BadRequestException } from '@nestjs/common';

// A curated slice of the most common passwords. Django ships a ~20k list via
// CommonPasswordValidator; this covers the realistic ones a challenge needs.
const COMMON = new Set([
  'password', 'password1', 'passw0rd', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', 'abc12345', 'iloveyou', 'letmein',
  'welcome', 'welcome1', 'admin', 'admin123', 'monkey', 'dragon', 'sunshine',
  'princess', 'football', 'baseball', 'superman', 'trustno1', 'whatever',
  'starwars', 'michael', 'shadow', 'master', 'hello123', 'freedom', 'ninja',
  'azerty', 'samsung', 'charlie', 'donald', 'login', 'flower', 'batman',
]);

/** Identifying tokens from the email's local part (before @), length >= 4. */
function emailTokens(email: string): string[] {
  const local = email.toLowerCase().split('@')[0] ?? '';
  return [local, ...local.split(/[^a-z0-9]+/)].filter((t) => t.length >= 4);
}

/**
 * Validate password strength, mirroring the four Django validators that matter:
 * minimum length, not entirely numeric, not a common password, and not too
 * similar to the email address.
 */
export function validatePasswordStrength(secret: string, email?: string): void {
  if (secret.length < 8) {
    throw new BadRequestException(
      'This password is too short. It must contain at least 8 characters.',
    );
  }
  if (/^\d+$/.test(secret)) {
    throw new BadRequestException('This password is entirely numeric.');
  }
  const lower = secret.toLowerCase();
  if (COMMON.has(lower)) {
    throw new BadRequestException('This password is too common.');
  }
  if (email) {
    for (const token of emailTokens(email)) {
      if (lower.includes(token) || token.includes(lower)) {
        throw new BadRequestException('The password is too similar to the email address.');
      }
    }
  }
}
