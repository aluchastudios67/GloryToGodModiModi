import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../common/http-error';

export type ThrottleWindow = {
  /** Requests permitted per key within the window. */
  max: number;
  windowMs: number;
};

export const THROTTLE_KEY = 'auth:throttle';

/**
 * Per-route limits for the credential endpoints, tighter than the global floor.
 *
 * Limits apply per IP **and** per email independently: an attacker spreading
 * one password across many accounts is throttled by IP, and a botnet spread
 * across many IPs against one account is throttled by email. Either alone
 * leaves an obvious hole.
 */
export const Throttle = (...windows: ThrottleWindow[]) =>
  SetMetadata(THROTTLE_KEY, windows);

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

type Counter = { count: number; resetAt: number };

/**
 * Fixed-window counters in process memory.
 *
 * Deliberately simple, and deliberately documented as insufficient for more
 * than one instance: the counters are per-process and reset on deploy. Two
 * instances double every limit. Redis or the platform limiter is the fix, and
 * DEFERRED.md says so.
 */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly counters = new Map<string, Counter>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const windows = this.reflector.getAllAndOverride<ThrottleWindow[]>(
      THROTTLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!windows || windows.length === 0) return true;

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const route = `${request.method}:${request.routeOptions?.url ?? request.url}`;

    for (const identity of this.identitiesOf(request)) {
      for (const window of windows) {
        this.consume(`${route}|${identity}|${window.windowMs}`, window);
      }
    }

    return true;
  }

  /** IP always; email too when the body carries one. */
  private identitiesOf(request: FastifyRequest): string[] {
    const identities = [`ip:${request.ip}`];

    const body: unknown = request.body;
    if (typeof body === 'object' && body !== null && 'email' in body) {
      const { email } = body;
      if (typeof email === 'string' && email.length > 0) {
        identities.push(`email:${email.trim().toLowerCase()}`);
      }
    }

    return identities;
  }

  private consume(key: string, window: ThrottleWindow): void {
    const now = Date.now();
    this.sweep(now);

    const existing = this.counters.get(key);

    if (!existing || existing.resetAt <= now) {
      this.counters.set(key, { count: 1, resetAt: now + window.windowMs });
      return;
    }

    existing.count += 1;

    if (existing.count > window.max) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      throw new AppError(
        'RATE_LIMITED',
        429,
        `Too many attempts. Retry in ${retryAfter}s.`,
      );
    }
  }

  /** Drops expired counters so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < MINUTE) return;
    this.lastSweep = now;
    for (const [key, counter] of this.counters) {
      if (counter.resetAt <= now) this.counters.delete(key);
    }
  }

  /** Test seam: forget every counter. */
  reset(): void {
    this.counters.clear();
  }
}
