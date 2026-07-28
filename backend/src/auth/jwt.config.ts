/** JWT + cookie settings, read from the environment (with dev-safe defaults). */
export const jwtSecret = (): string =>
  process.env.JWT_SECRET ?? 'dev-insecure-change-me-in-prod';

export const accessTtlMin = (): number => Number(process.env.JWT_ACCESS_TTL_MIN ?? 15);
export const refreshTtlDays = (): number => Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7);

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

export interface CookieOpts {
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: '/';
  maxAge: number;
}

export function cookieOptions(maxAgeMs: number): CookieOpts {
  const sameSite = (process.env.JWT_COOKIE_SAMESITE ?? 'Lax').toLowerCase() as
    | 'lax'
    | 'strict'
    | 'none';
  return {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export const accessMaxAgeMs = (): number => accessTtlMin() * 60 * 1000;
export const refreshMaxAgeMs = (): number => refreshTtlDays() * 24 * 60 * 60 * 1000;
