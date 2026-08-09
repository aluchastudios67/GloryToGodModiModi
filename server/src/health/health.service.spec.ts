import { describe, expect, it, vi } from 'vitest';
import { DB_PING_TIMEOUT_MS, Pinger, pingDatabase } from './health.service';

/** A Prisma stand-in whose `$queryRaw` we control. */
const pinger = (impl: () => Promise<unknown>): Pinger =>
  ({ $queryRaw: impl } as unknown as Pinger);

describe('pingDatabase', () => {
  it('reports up when the query resolves', async () => {
    await expect(
      pingDatabase(pinger(() => Promise.resolve([{ '?column?': 1 }]))),
    ).resolves.toBe('up');
  });

  it('reports down instead of throwing when the query rejects', async () => {
    await expect(
      pingDatabase(pinger(() => Promise.reject(new Error('ECONNREFUSED')))),
    ).resolves.toBe('down');
  });

  it('reports down when the query hangs, without waiting for it', async () => {
    // The failure mode that matters: a database that accepts the connection and
    // never answers. Unbounded, this hangs the platform's probe.
    const hangs = pinger(() => new Promise(() => {}));

    const startedAt = Date.now();
    const status = await pingDatabase(hangs, undefined, 150);
    const elapsed = Date.now() - startedAt;

    expect(status).toBe('down');
    expect(elapsed).toBeLessThan(1_000);
  });

  it('resolves well inside the 3s budget at the real 2s timeout', async () => {
    const hangs = pinger(() => new Promise(() => {}));

    const startedAt = Date.now();
    const status = await pingDatabase(hangs);
    const elapsed = Date.now() - startedAt;

    expect(status).toBe('down');
    expect(DB_PING_TIMEOUT_MS).toBe(2_000);
    expect(elapsed).toBeGreaterThanOrEqual(DB_PING_TIMEOUT_MS - 50);
    expect(elapsed).toBeLessThan(3_000);
  });

  it('clears its timeout so the process can exit promptly', async () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');

    await pingDatabase(pinger(() => Promise.resolve(1)));

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('swallows a synchronous throw from the client', async () => {
    const throws = pinger(() => {
      throw new Error('client not connected');
    });

    await expect(pingDatabase(throws)).resolves.toBe('down');
  });
});
