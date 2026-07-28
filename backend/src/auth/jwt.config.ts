/** JWT + cookie settings, read from the environment (with dev-safe defaults). */
export const jwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  // Fail fast in production rather than signing tokens with a public constant.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production.');
  }
  return 'dev-insecure-change-me-in-prod';
};

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
  // Secure defaults to on in production (unless explicitly disabled), so a deploy
  // that forgets JWT_COOKIE_SECURE doesn't ship auth cookies over plaintext HTTP.
  const rawSecure = process.env.JWT_COOKIE_SECURE;
  const secure = rawSecure !== undefined ? rawSecure === 'true' : process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export const accessMaxAgeMs = (): number => accessTtlMin() * 60 * 1000;
export const refreshMaxAgeMs = (): number => refreshTtlDays() * 24 * 60 * 60 * 1000;
