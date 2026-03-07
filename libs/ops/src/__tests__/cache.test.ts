import { describe, expect, it, vi, beforeEach } from "@jest/globals";
import { CacheAdapter, CacheManager } from "../cache.js";

class InMemoryCache implements CacheAdapter {
  store = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  async setex(key: string, _ttl: number, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async keys(pattern: string): Promise<string[]> {
    const prefix = pattern.replace("*", "");
    return [...this.store.keys()].filter((key) => key.startsWith(prefix));
  }
  async del(keys: string[]): Promise<number> {
    let removed = 0;
    keys.forEach((key) => {
      removed += this.store.delete(key) ? 1 : 0;
    });
    return removed;
  }
}

describe("CacheManager", () => {
  let adapter: InMemoryCache;
  let cache: CacheManager;

  beforeEach(() => {
    adapter = new InMemoryCache();
    cache = new CacheManager(adapter);
  });

  it("stores computed value when miss and returns cached on hit", async () => {
    const factory = vi.fn().mockResolvedValue({ foo: "bar" });
    const first = await cache.remember("demo:1", 30, factory);
    const second = await cache.remember("demo:1", 30, factory);

    expect(first).toEqual({ foo: "bar" });
    expect(second).toEqual(first);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("bust removes matching keys", async () => {
    await cache.remember("group:item1", 30, async () => "a");
    await cache.remember("group:item2", 30, async () => "b");
    await cache.bust("group");

    const miss = await cache.remember("group:item1", 30, async () => "c");
    expect(miss).toBe("c");
  });

  it("throws when ttl is non-positive", async () => {
    await expect(cache.remember("invalid", 0, async () => "x")).rejects.toThrow(
      "cache_ttl_must_be_positive"
    );
  });
});
