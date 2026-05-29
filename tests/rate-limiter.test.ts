import { describe, expect, it } from "vitest";

import { RateLimiter } from "../src/scrive/rate-limiter.js";

describe("RateLimiter", () => {
  it("allows callsPerWindow calls per fixed window and reports the retry delay", () => {
    let clock = 0;
    const limiter = new RateLimiter({ callsPerWindow: 2, duration: 20, now: () => clock });

    expect(limiter.take("key")).toBe(0);
    clock += 19_999;
    expect(limiter.take("key")).toBe(0);
    expect(limiter.take("key")).toBe(1);
  });

  it("starts a fresh window after the duration and tracks keys independently", () => {
    let clock = 0;
    const limiter = new RateLimiter({ callsPerWindow: 1, duration: 10, now: () => clock });

    expect(limiter.take("a")).toBe(0);
    expect(limiter.take("a")).toBeGreaterThan(0);
    expect(limiter.take("b")).toBe(0);

    clock += 10_000;
    expect(limiter.take("a")).toBe(0);
  });

  it("never exceeds maxKeys, even under a flood of distinct keys", () => {
    const limiter = new RateLimiter({
      callsPerWindow: 1,
      duration: 60,
      maxKeys: 100,
      now: () => 0,
    });

    for (let index = 0; index < 10_000; index++) {
      expect(limiter.take(`key-${index}`)).toBe(0);
    }

    expect(limiter.size).toBeLessThanOrEqual(100);
  });

  it("keeps an active key throttled while other keys flood the cap", () => {
    const limiter = new RateLimiter({ callsPerWindow: 1, duration: 60, maxKeys: 2, now: () => 0 });

    expect(limiter.take("victim")).toBe(0);
    expect(limiter.take("victim")).toBeGreaterThan(0);

    for (let index = 0; index < 100; index++) {
      limiter.take(`flood-${index}`);
      expect(limiter.take("victim")).toBeGreaterThan(0);
    }
  });
});
