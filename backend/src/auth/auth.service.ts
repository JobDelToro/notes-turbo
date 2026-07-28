import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';
import { RevokedToken } from '../entities/revoked-token.entity';
import { DEFAULT_CATEGORIES } from './default-categories';
import { validatePasswordStrength } from './strength';
import { accessTtlMin, jwtSecret, refreshTtlDays } from './jwt.config';

export interface TokenPair {
  access: string;
  refresh: string;
}

interface RefreshPayload {
  sub: number;
  type: string;
  jti: string;
  exp?: number;
}

// A throwaway bcrypt hash used to equalize login timing on the user-not-found
// path (so login time doesn't reveal whether an email is registered).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

/**
 * Pre-hash the password with SHA-256 before bcrypt. bcrypt silently truncates
 * input at 72 bytes; SHA-256 (base64) is well under that, so arbitrarily long
 * passwords keep their full entropy and nothing is silently dropped.
 */
function prehash(password: string): string {
  return createHash('sha256').update(password, 'utf8').digest('base64');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(RevokedToken) private readonly revoked: Repository<RevokedToken>,
    private readonly jwt: JwtService,
  ) {}

  /** Create a user (email is lowercased + unique), hash the password, seed categories. */
  async register(email: string, password: string): Promise<User> {
    const normalized = email.toLowerCase();
    validatePasswordStrength(password, normalized);
    if (await this.users.existsBy({ email: normalized })) {
      throw new BadRequestException('A user with this email already exists.');
    }
    const hash = await bcrypt.hash(prehash(password), 10);
    const user = await this.users.save(this.users.create({ email: normalized, password: hash }));
    await this.seedCategories(user.id);
    return user;
  }

  private async seedCategories(userId: number): Promise<void> {
    const rows = DEFAULT_CATEGORIES.map((c) =>
      this.categories.create({ userId, name: c.name, color: c.color }),
    );
    await this.categories.save(rows);
  }

  /** Return the user if the email + password are valid, else null (constant-ish time). */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Spend the same work as a real compare so timing doesn't leak existence.
      await bcrypt.compare(prehash(password), DUMMY_HASH);
      return null;
    }
    return (await bcrypt.compare(prehash(password), user.password)) ? user : null;
  }

  async issueTokens(userId: number): Promise<TokenPair> {
    const access = await this.jwt.signAsync(
      { sub: userId, type: 'access' },
      { secret: jwtSecret(), expiresIn: `${accessTtlMin()}m` },
    );
    const refresh = await this.jwt.signAsync(
      { sub: userId, type: 'refresh', jti: randomUUID() },
      { secret: jwtSecret(), expiresIn: `${refreshTtlDays()}d` },
    );
    return { access, refresh };
  }

  /**
   * Verify the refresh token and rotate it. The single-use guarantee is enforced
   * atomically by the DB: `claimJti` inserts the jti (primary key), so two
   * concurrent refreshes race on the insert and exactly one wins — the loser
   * (and any later replay) sees the jti already claimed and is rejected. No
   * check-then-act window, and no 500 on the duplicate.
   */
  async rotateRefresh(rawRefresh: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshSignature(rawRefresh);
    if (!(await this.claimJti(payload.jti, payload.exp))) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    return this.issueTokens(payload.sub);
  }

  /** Best-effort blacklist of the presented refresh token (used on logout). */
  async revokeRefresh(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    try {
      const payload = await this.verifyRefreshSignature(rawRefresh);
      await this.claimJti(payload.jti, payload.exp);
    } catch {
      // An invalid/expired token needs no revoking.
    }
  }

  /** Delete revoked-token rows whose underlying JWT has already expired. */
  async purgeExpiredTokens(nowSeconds: number): Promise<number> {
    const result = await this.revoked
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: nowSeconds })
      .execute();
    return result.affected ?? 0;
  }

  private async verifyRefreshSignature(rawRefresh: string): Promise<RefreshPayload> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(rawRefresh, { secret: jwtSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    return payload;
  }

  /** Atomically claim a jti. Returns false if it was already claimed (single-use). */
  private async claimJti(jti: string, exp?: number): Promise<boolean> {
    try {
      await this.revoked.insert({ jti, expiresAt: exp ?? 0 });
      return true;
    } catch {
      return false; // duplicate primary key => already revoked/rotated
    }
  }
}
