import { BadRequestException } from '@nestjs/common';

/**
 * Validate password strength, mirroring the Django validators that matter here:
 * a minimum length and not entirely numeric. (Django also checks against a large
 * common-password list; a real deployment can add one via a dedicated package.)
 */
export function validatePasswordStrength(secret: string): void {
  if (secret.length < 8) {
    throw new BadRequestException(
      'This password is too short. It must contain at least 8 characters.',
    );
  }
  if (/^\d+$/.test(secret)) {
    throw new BadRequestException('This password is entirely numeric.');
  }
}
