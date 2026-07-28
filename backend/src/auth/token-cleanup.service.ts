import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Periodically drops revoked-token rows whose underlying JWT has already expired,
 * so the blacklist can't grow without bound. A plain unref'd interval keeps this
 * dependency-free; the actual delete lives in AuthService.purgeExpiredTokens.
 */
@Injectable()
export class TokenCleanupService implements OnModuleInit, OnModuleDestroy {
  private static readonly INTERVAL_MS = 60 * 60 * 1000; // hourly
  private readonly logger = new Logger('TokenCleanup');
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly auth: AuthService) {}

  onModuleInit(): void {
    // No background timer under test — it would leak across suites.
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.run(), TokenCleanupService.INTERVAL_MS);
    this.timer.unref?.(); // never keep the process alive just for cleanup
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Run one purge pass; returns the number of rows removed. */
  async run(): Promise<number> {
    const removed = await this.auth.purgeExpiredTokens(Math.floor(Date.now() / 1000));
    if (removed > 0) this.logger.log(`Purged ${removed} expired revoked tokens`);
    return removed;
  }
}
