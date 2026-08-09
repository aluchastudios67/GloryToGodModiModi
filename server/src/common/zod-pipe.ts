import { PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { formatZodError } from './error.filter';
import { AppError } from './http-error';

/**
 * The single validation pipe. Parse, don't validate: what comes out is typed
 * and trusted; what went in is not.
 *
 * Usage: `@Body(new ZodValidationPipe(CreateBookingSchema)) body: CreateBooking`
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw AppError.badRequest(formatZodError(result.error), result.error.issues);
  }
}
