import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Upper bound so a hostile client cannot push a novel into every log line. */
const MAX_LENGTH = 200;

/**
 * Fastify `genReqId`: honour an inbound `x-request-id` so a trace survives a
 * proxy hop, otherwise mint one. The value ends up on `request.id`, on every
 * pino line, and in the error envelope.
 */
export function genReqId(req: { headers: Record<string, unknown> }): string {
  const header: unknown = req.headers[REQUEST_ID_HEADER];
  const value: unknown = Array.isArray(header) ? header[0] : header;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_LENGTH) return trimmed;
  }

  return randomUUID();
}

/** Best-effort read of the request id off a Fastify request. */
export function requestIdOf(request: unknown): string {
  if (typeof request === 'object' && request !== null && 'id' in request) {
    const { id } = request;
    if (typeof id === 'string') return id;
  }
  return 'unknown';
}
