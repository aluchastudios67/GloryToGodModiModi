import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError, ERROR_CODES, toEnvelope } from './http-error';
import { requestIdOf } from './request-id';

type Resolved = { status: number; code: string; message: string };

/**
 * Catches everything and emits the one error envelope. Nothing else in the
 * codebase is allowed to write an error body — one shape means the app can
 * parse failures with a single function.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();
    const requestId = requestIdOf(request);

    const { status, code, message } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        { requestId, code, err: exception },
        `Unhandled error: ${message}`,
      );
    } else {
      this.logger.warn({ requestId, code, status }, message);
    }

    void reply.status(status).send(toEnvelope(code, message, requestId));
  }

  private resolve(exception: unknown): Resolved {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ZodError) {
      return {
        status: 400,
        code: ERROR_CODES.VALIDATION_FAILED,
        message: formatZodError(exception),
      };
    }

    if (exception instanceof HttpException) {
      return {
        status: exception.getStatus(),
        code: codeForStatus(exception.getStatus()),
        message: nestMessage(exception),
      };
    }

    // Anything else is a bug. Never leak the message — it can carry a
    // connection string, a query or a stack path.
    return {
      status: 500,
      code: ERROR_CODES.INTERNAL,
      message: 'Internal server error',
    };
  }
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

function codeForStatus(status: number): string {
  switch (status) {
    case 400:
      return ERROR_CODES.VALIDATION_FAILED;
    case 401:
      return ERROR_CODES.UNAUTHORIZED;
    case 403:
      return ERROR_CODES.FORBIDDEN;
    case 404:
      return ERROR_CODES.NOT_FOUND;
    case 429:
      return ERROR_CODES.RATE_LIMITED;
    case 503:
      return ERROR_CODES.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ERROR_CODES.INTERNAL : 'HTTP_ERROR';
  }
}

/** Nest packs its message into a string or an object depending on the throw site. */
function nestMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;

  if (typeof response === 'object' && response !== null) {
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join('; ');
  }

  return exception.message;
}
