/**
 * Single-flight refresh.
 *
 * The bug this exists to prevent: a screen mounts, fires four queries, all four
 * get a 401, all four ask for a refresh. The first rotates the token and the
 * other three present the now-revoked one — which trips the server's reuse
 * detection, burns the family, and logs the user out for doing nothing wrong.
 *
 * So exactly one refresh may be in flight. Everyone else waits on that same
 * promise and retries with whatever it produces.
 *
 * Deliberately free of axios, React Native and React so it can be tested as
 * plain functions — which is the only way to prove "four callers, one refresh".
 */

export type RefreshFn = () => Promise<string>;

export class RefreshQueue {
  /** Non-null exactly while a refresh is in flight. */
  private inFlight: Promise<string> | null = null;

  /** How many refreshes have actually been performed. Test seam. */
  private performed = 0;

  constructor(private readonly refresh: RefreshFn) {}

  /**
   * Returns a fresh access token, performing at most one refresh no matter how
   * many callers arrive while it is running.
   */
  async run(): Promise<string> {
    if (this.inFlight) return this.inFlight;

    this.performed += 1;

    // Assigned before the first await so a synchronous second caller sees it.
    this.inFlight = this.refresh().finally(() => {
      this.inFlight = null;
    });

    return this.inFlight;
  }

  get refreshCount(): number {
    return this.performed;
  }

  get isRefreshing(): boolean {
    return this.inFlight !== null;
  }

  /** Test seam. */
  reset(): void {
    this.inFlight = null;
    this.performed = 0;
  }
}
