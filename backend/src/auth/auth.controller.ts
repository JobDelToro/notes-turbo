import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService, TokenPair } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import { publicUser } from './user.serializer';
import { User } from '../entities/user.entity';
import { ScopedThrottlerGuard } from '../common/scoped-throttler.guard';
import { ThrottleScope } from '../common/throttle-scope.decorator';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessMaxAgeMs,
  cookieOptions,
  refreshMaxAgeMs,
} from './jwt.config';

// register/login/refresh SHARE one 10/min counter (the `auth` scope), matching
// Django's ScopedRateThrottle; `me`/`logout` are not throttled.
const AUTH_RATE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
@UseGuards(ScopedThrottlerGuard)
@ThrottleScope('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setAuthCookies(res: Response, tokens: TokenPair): void {
    res.cookie(ACCESS_COOKIE, tokens.access, cookieOptions(accessMaxAgeMs()));
    res.cookie(REFRESH_COOKIE, tokens.refresh, cookieOptions(refreshMaxAgeMs()));
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Public()
  @Throttle(AUTH_RATE)
  @Post('register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto.email, dto.password);
    this.setAuthCookies(res, await this.auth.issueTokens(user.id));
    return { user: publicUser(user) };
  }

  @Public()
  @Throttle(AUTH_RATE)
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid email or password.');
    this.setAuthCookies(res, await this.auth.issueTokens(user.id));
    return { user: publicUser(user) };
  }

  @Public()
  @SkipThrottle()
  @Post('logout')
  @HttpCode(205)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE];
    await this.auth.revokeRefresh(raw);
    this.clearAuthCookies(res);
  }

  @Public()
  @Throttle(AUTH_RATE)
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = (req as Request & { cookies?: Record<string, string> }).cookies?.[REFRESH_COOKIE];
    if (!raw) throw new UnauthorizedException('No refresh token.');
    this.setAuthCookies(res, await this.auth.rotateRefresh(raw));
    return { detail: 'Token refreshed.' };
  }

  @SkipThrottle()
  @Get('me')
  me(@CurrentUser() user: User) {
    return { user: publicUser(user) };
  }
}
