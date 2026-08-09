import { describe, expect, it, vi } from 'vitest';
import { RefreshQueue } from './refresh-queue';

/** Resolves only when you tell it to, so overlap is deterministic. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('RefreshQueue', () => {
  it('performs exactly one refresh for four concurrent callers', async () => {
    const gate = deferred<string>();
    const refresh = vi.fn(() => gate.promise);
    const queue = new RefreshQueue(refresh);

    // Four screens hitting 401 at the same moment — the exact scenario that
    // otherwise trips the server's token-reuse detection.
    const callers = [queue.run(), queue.run(), queue.run(), queue.run()];

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(queue.refreshCount).toBe(1);

    gate.resolve('new-access-token');
    const results = await Promise.all(callers);

    expect(results).toEqual([
      'new-access-token',
      'new-access-token',
      'new-access-token',
      'new-access-token',
    ]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after the first settles', async () => {
    const refresh = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    const queue = new RefreshQueue(refresh);

    expect(await queue.run()).toBe('first');
    expect(await queue.run()).toBe('second');
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('gives every waiter the same failure', async () => {
    const gate = deferred<string>();
    const refresh = vi.fn(() => gate.promise);
    const queue = new RefreshQueue(refresh);

    const callers = [queue.run(), queue.run(), queue.run()];
    gate.reject(new Error('refresh rejected'));

    await Promise.all(
      callers.map((caller) =>
        expect(caller).rejects.toThrow('refresh rejected'),
      ),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('recovers after a failure instead of latching', async () => {
    const refresh = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce('recovered');
    const queue = new RefreshQueue(refresh);

    await expect(queue.run()).rejects.toThrow('network down');
    expect(queue.isRefreshing).toBe(false);

    expect(await queue.run()).toBe('recovered');
  });

  it('does not leave the gate closed once settled', async () => {
    const queue = new RefreshQueue(() => Promise.resolve('token'));

    await queue.run();
    expect(queue.isRefreshing).toBe(false);
  });

  it('collapses a burst arriving mid-flight, not just at the start', async () => {
    const gate = deferred<string>();
    const refresh = vi.fn(() => gate.promise);
    const queue = new RefreshQueue(refresh);

    const first = queue.run();
    await Promise.resolve(); // let a microtask elapse
    const late = queue.run();

    gate.resolve('one-token');
    expect(await first).toBe('one-token');
    expect(await late).toBe('one-token');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
