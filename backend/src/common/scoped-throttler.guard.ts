import { createHash } from 'node:crypto';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_SCOPE } from './throttle-scope.decorator';

/**
 * A ThrottlerGuard that counts by an explicit `@ThrottleScope` label rather than
 * by controller+handler, so a set of routes shares one limit. This mirrors
 * Django's ScopedRateThrottle: every `auth` route shares one 10/min counter and
 * every `ai` route shares one 20/min counter, instead of each endpoint getting
 * its own bucket.
 */
@Injectable()
export class ScopedThrottlerGuard extends ThrottlerGuard {
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const scope = this.reflector.getAllAndOverride<string>(THROTTLE_SCOPE, [
      context.getHandler(),
      context.getClass(),
    ]);
    const group = scope ?? `${context.getClass().name}-${context.getHandler().name}`;
    return createHash('md5').update(`${name}-${group}-${suffix}`).digest('hex');
  }
}
