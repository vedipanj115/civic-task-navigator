import type { ApiErrorCode, ApiErrorResponse } from '@cn/shared';

/**
 * Thrown by route handlers; caught by the error middleware in app.ts, which
 * reads `.status` and `.toBody()` to produce the exact envelope docs/04 § 4
 * requires. Handlers here are synchronous, so Express 4 forwards a thrown
 * HttpError to that middleware automatically — no next(err) plumbing needed.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly field: string | null;
  readonly details: Record<string, unknown> | null;

  constructor(status: number, code: ApiErrorCode, message: string, field: string | null = null, details: Record<string, unknown> | null = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.field = field;
    this.details = details;
  }

  toBody(): ApiErrorResponse {
    return { error: { code: this.code, message: this.message, field: this.field, details: this.details } };
  }
}

export function validationFailed(message: string, field: string | null = null): HttpError {
  return new HttpError(400, 'VALIDATION_FAILED', message, field);
}

export function procedureNotFound(procedureId: string): HttpError {
  return new HttpError(404, 'PROCEDURE_NOT_FOUND', `No procedure with id "${procedureId}".`);
}

export function stepNotFound(stepId: string): HttpError {
  return new HttpError(404, 'STEP_NOT_FOUND', `No step with id "${stepId}".`);
}

export function dataIntegrityError(message: string, details: Record<string, unknown> | null = null): HttpError {
  return new HttpError(409, 'DATA_INTEGRITY_ERROR', message, null, details);
}

export function notImplemented(message: string): HttpError {
  return new HttpError(501, 'INTERNAL_ERROR', message);
}
