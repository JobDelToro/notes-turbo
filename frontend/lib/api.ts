/**
 * Typed fetch wrapper for the Notes API.
 *
 * Responsibilities:
 *  - Always send httpOnly auth cookies (`credentials: 'include'`).
 *  - Normalize errors into a single `ApiError` carrying the HTTP status and the
 *    human message from the backend's `{ error: { message } }` envelope.
 *  - Validate every successful JSON body with a Zod schema so the rest of the
 *    app works with trustworthy, typed data.
 *
 * The base URL comes from `NEXT_PUBLIC_API_URL` (default matches the backend's
 * dev default). Cookies are unreadable from JS, so auth state is derived from
 * `/auth/me` rather than from any token.
 */
import type { ZodType } from 'zod';
import { ApiErrorSchema } from './schemas';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
).replace(/\/$/, '');

/** Error thrown for any non-2xx response (or a network/parse failure). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code = 'error', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the request failed because the user is not authenticated. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

interface RequestOptions<TResponse> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /**
   * JSON body; serialized and sent as `application/json`. Typed as `unknown`
   * because callers (see `lib/endpoints.ts`) supply already-typed payloads;
   * the value only needs to be JSON-serializable here.
   */
  body?: unknown;
  /** Zod schema to validate and type the response. Omit for empty responses. */
  schema?: ZodType<TResponse>;
  signal?: AbortSignal;
}

/**
 * Auth endpoints whose own 401 must NOT trigger a silent refresh-and-retry: a bad
 * login or an expired/absent refresh token is a terminal answer, and retrying
 * `/auth/refresh` against itself would loop.
 */
const NON_REFRESHABLE_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/**
 * In-flight silent refresh, shared across callers.
 *
 * The access cookie is short-lived (15 min); when it expires the next request
 * 401s. We exchange the longer-lived refresh cookie for a new access cookie and
 * replay the original request, so a valid session survives access-token expiry
 * instead of bouncing the user to /login.
 *
 * Concurrent 401s (e.g. notes + categories firing on the same tick) MUST share a
 * single refresh call: refresh rotation blacklists the old token server-side, so
 * two parallel refreshes would invalidate each other. All callers await the same
 * promise; it's cleared once settled so the next expiry starts a fresh one.
 */
let inflightRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  inflightRefresh ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

async function extractError(response: Response): Promise<ApiError> {
  let message = `Request failed (${response.status})`;
  let code = 'error';
  let details: unknown;
  try {
    const data: unknown = await response.json();
    const parsed = ApiErrorSchema.safeParse(data);
    if (parsed.success) {
      message = parsed.data.error.message;
      code = parsed.data.error.code;
      details = parsed.data.error.details;
    } else if (data && typeof data === 'object' && 'detail' in data) {
      message = String((data as { detail: unknown }).detail);
    }
  } catch {
    // Non-JSON error body — keep the generic message.
  }
  return new ApiError(message, response.status, code, details);
}

/**
 * Core request helper. Resolves to the parsed body (or `undefined` for empty
 * 204/205 responses), and throws `ApiError` on any failure.
 */
export async function apiFetch<TResponse = void>(
  path: string,
  options: RequestOptions<TResponse> = {},
  isRetry = false,
): Promise<TResponse> {
  const { method = 'GET', body, schema, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    // Network error / CORS / server down.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(
      'Could not reach the server. Please check your connection.',
      0,
      'network_error',
    );
  }

  // Access token likely expired: attempt one silent refresh, then replay the
  // request once. A 401 means the server did not process the request, so even a
  // POST/PATCH/DELETE is safe to replay. `isRetry` bounds this to a single retry.
  if (
    response.status === 401 &&
    !isRetry &&
    !NON_REFRESHABLE_PATHS.some((prefix) => path.startsWith(prefix)) &&
    (await refreshSession())
  ) {
    return apiFetch(path, options, true);
  }

  if (!response.ok) {
    throw await extractError(response);
  }

  // No content (logout is 205, delete is 204) or caller doesn't want the body.
  if (response.status === 204 || response.status === 205 || !schema) {
    return undefined as TResponse;
  }

  const data: unknown = await response.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(
      'The server returned an unexpected response.',
      response.status,
      'invalid_response',
      parsed.error.issues,
    );
  }
  return parsed.data;
}
