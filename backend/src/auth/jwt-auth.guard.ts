import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { User } from '../entities/user.entity';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ACCESS_COOKIE, jwtSecret } from './jwt.config';

interface AccessPayload {
  sub: number;
  type: string;
}

/**
 * Global auth guard. Reads the access token from the httpOnly cookie (or an
 * `Authorization: Bearer` header, for tooling and tests), verifies it, and
 * attaches the `User` to the request. Routes marked `@Public()` skip it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: User }>();
    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Authentication credentials were not provided.');
    }

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret: jwtSecret() });
    } catch {
      throw new UnauthorizedException('Given token not valid for any token type.');
    }
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Given token not valid for any token type.');
    }

    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found.');
    }
    req.user = user;
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    return cookies?.[ACCESS_COOKIE];
  }
}
