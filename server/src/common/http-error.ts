/**
 * The application's error vocabulary.
 *
 * `code` is the stable contract: the app switches on it and maps it to Georgian
 * text. Never send user-facing Georgian from the API — the client owns
 * language, the server owns meaning.
 */
export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES] | (string & {});

/** The only error type services are allowed to throw deliberately. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
    /** Never serialised to the client; for the log line only. */
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, detail?: unknown): AppError {
    return new AppError(ERROR_CODES.VALIDATION_FAILED, 400, message, detail);
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError(ERROR_CODES.UNAUTHORIZED, 401, message);
  }

  static forbidden(message = 'Not permitted'): AppError {
    return new AppError(ERROR_CODES.FORBIDDEN, 403, message);
  }

  static notFound(message = 'Not found'): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, 404, message);
  }
}

/** The single response shape for every failure in the system. */
export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
};

export function toEnvelope(
  code: string,
  message: string,
  requestId: string,
): ErrorEnvelope {
  return { error: { code, message, requestId } };
}
