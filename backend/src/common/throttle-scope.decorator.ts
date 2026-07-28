import { SetMetadata } from '@nestjs/common';

/** Groups several routes under one shared rate-limit counter (see ScopedThrottlerGuard). */
export const THROTTLE_SCOPE = 'throttle_scope';
export const ThrottleScope = (scope: string) => SetMetadata(THROTTLE_SCOPE, scope);
