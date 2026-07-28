import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    if (await this.users.existsBy({ email: normalized })) {
      throw new BadRequestException('A user with this email already exists.');
    }
    validatePasswordStrength(password);
    const hash = await bcrypt.hash(password, 10);
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

  /** Return the user if the email + password are valid, else null. */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    if (!user) return null;
    return (await bcrypt.compare(password, user.password)) ? user : null;
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

  /** Verify the refresh token, revoke it (rotation), and mint a fresh pair. */
  async rotateRefresh(rawRefresh: string): Promise<TokenPair> {
    const payload = await this.verifyRefresh(rawRefresh);
    await this.revoke(payload.jti, payload.exp);
    return this.issueTokens(payload.sub);
  }

  /** Best-effort blacklist of the presented refresh token (used on logout). */
  async revokeRefresh(rawRefresh: string | undefined): Promise<void> {
    if (!rawRefresh) return;
    try {
      const payload = await this.verifyRefresh(rawRefresh);
      await this.revoke(payload.jti, payload.exp);
    } catch {
      // An invalid/expired token needs no revoking.
    }
  }

  private async verifyRefresh(rawRefresh: string): Promise<RefreshPayload> {
    let payload: RefreshPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(rawRefresh, { secret: jwtSecret() });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    if (payload.type !== 'refresh' || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (await this.revoked.existsBy({ jti: payload.jti })) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
    return payload;
  }

  private async revoke(jti: string, exp?: number): Promise<void> {
    await this.revoked.save(this.revoked.create({ jti, expiresAt: exp ?? 0 }));
  }
}
