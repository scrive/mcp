export interface RateLimiterOptions {
  callsPerWindow: number;
  duration: number;
  maxKeys?: number;
  now?: () => number;
}

interface WindowState {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly windows = new Map<string, WindowState>();
  private readonly callsPerWindow: number;
  private readonly durationMs: number;
  private readonly maxKeys: number;
  private readonly now: () => number;

  constructor(options: RateLimiterOptions) {
    this.callsPerWindow = options.callsPerWindow;
    this.durationMs = options.duration * 1000;
    this.maxKeys = options.maxKeys ?? 100_000;
    this.now = options.now ?? Date.now;
  }

  take(key: string): number {
    const now = this.now();
    let window = this.windows.get(key);

    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + this.durationMs };
    }

    this.markRecentlyUsed(key, window);
    this.evictIfFull();

    if (window.count >= this.callsPerWindow) {
      return Math.ceil((window.resetAt - now) / 1000);
    }

    window.count += 1;
    return 0;
  }

  get size(): number {
    return this.windows.size;
  }

  private markRecentlyUsed(key: string, window: WindowState): void {
    this.windows.delete(key);
    this.windows.set(key, window);
  }

  private evictIfFull(): void {
    if (this.windows.size > this.maxKeys) {
      const oldest = this.windows.keys().next().value;
      if (oldest !== undefined) {
        this.windows.delete(oldest);
      }
    }
  }
}
