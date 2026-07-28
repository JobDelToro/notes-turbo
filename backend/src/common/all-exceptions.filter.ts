import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/** Map an HTTP status to a short, stable machine code (mirrors DRF default_code). */
function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'invalid';
    case 401:
      return 'not_authenticated';
    case 403:
      return 'permission_denied';
    case 404:
      return 'not_found';
    case 405:
      return 'method_not_allowed';
    case 429:
      return 'throttled';
    default:
      return 'error';
  }
}

/**
 * Wraps every error response in one consistent envelope so the client always
 * receives `{ error: { code, message, details? } }`, regardless of the failure.
 * This matches the contract the frontend validates with Zod.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error.';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const b = body as { message?: unknown; error?: unknown };
        if (Array.isArray(b.message)) {
          // class-validator returns an array of messages; surface the first.
          details = b.message;
          message = String(b.message[0]);
        } else if (typeof b.message === 'string') {
          message = b.message;
        } else if (typeof b.error === 'string') {
          message = b.error;
        }
      }
    } else {
      // Unexpected: log the stack so it is debuggable, but never leak internals.
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    const code = codeForStatus(status);
    const payload: { error: { code: string; message: string; details?: unknown } } = {
      error: { code, message },
    };
    if (details !== undefined) payload.error.details = details;
    res.status(status).json(payload);
  }
}
