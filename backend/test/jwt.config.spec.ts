import { cookieOptions, jwtSecret } from '../src/auth/jwt.config';

describe('jwt.config (unit)', () => {
  const KEYS = ['NODE_ENV', 'JWT_SECRET', 'JWT_COOKIE_SECURE'] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('throws in production when JWT_SECRET is unset (fail fast, no weak default)', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => jwtSecret()).toThrow(/JWT_SECRET/);
  });

  it('uses the env secret when it is set', () => {
    process.env.JWT_SECRET = 'a-real-secret';
    expect(jwtSecret()).toBe('a-real-secret');
  });

  it('cookies default to Secure in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_COOKIE_SECURE;
    expect(cookieOptions(1000).secure).toBe(true);
  });

  it('cookies are not Secure outside production (so HTTP dev works)', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_COOKIE_SECURE;
    expect(cookieOptions(1000).secure).toBe(false);
  });
});
