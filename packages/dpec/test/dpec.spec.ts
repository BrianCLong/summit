import { describe, expect, it, vi } from "vitest";
import {
  DeterministicPromptExecutionCache,
  type CacheKeyComponents,
  createOpenAIChatAdapter,
  createAnthropicMessagesAdapter,
} from "../src/index.js";

function buildKey(seed: string): CacheKeyComponents {
  return {
    modelHash: `model:${seed}`,
    tokenizerHash: `tokenizer:${seed}`,
    params: { temperature: 0.2, max_tokens: 64, seed },
    toolsGraphHash: `tools:${seed}`,
    promptHash: `prompt:${seed}`,
  };
}

describe("DeterministicPromptExecutionCache core", () => {
  it("returns deterministic hits with attestable proofs", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 4,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const key = buildKey("alpha");
    const fetcher = vi.fn(async () => ({ artifact: "artifact-alpha" }));

    const miss = await cache.resolve(key, fetcher);
    expect(miss.type).toBe("miss");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const hit = await cache.resolve(key, fetcher);
    expect(hit.type).toBe("hit");
    expect(fetcher).toHaveBeenCalledTimes(1);

    const manifest = cache.generateManifest();
    expect(manifest.entries).toHaveLength(1);
    expect(DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
    expect(DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(true);
    expect(Buffer.compare(miss.artifact, hit.artifact)).toBe(0);
  });

  it("produces verifiable eviction proofs and manifests", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 2,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const missA = await cache.resolve(buildKey("a"), async () => ({ artifact: "A" }));
    expect(missA.type).toBe("miss");
    const missB = await cache.resolve(buildKey("b"), async () => ({ artifact: "B" }));
    expect(missB.evictionProofs).toHaveLength(0);
    const missC = await cache.resolve(buildKey("c"), async () => ({ artifact: "C" }));
    expect(missC.evictionProofs.length).toBe(1);
    expect(DeterministicPromptExecutionCache.verifyEvictionProof(missC.evictionProofs[0])).toBe(
      true
    );

    const manifest = cache.generateManifest();
    expect(DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
    expect(manifest.entries.map((e) => e.key).sort()).toEqual(
      [missB.entry.key, missC.entry.key].sort()
    );
  });

  it("replays miss-fill traces to yield byte-identical artifacts", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 3,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const miss = await cache.resolve(buildKey("trace"), async () => ({ artifact: "TRACE-VALUE" }));
    expect(miss.type).toBe("miss");
    const ok = await DeterministicPromptExecutionCache.replayTrace(miss.trace, async () => ({
      artifact: "TRACE-VALUE",
    }));
    expect(ok).toBe(true);
    const bad = await DeterministicPromptExecutionCache.replayTrace(miss.trace, async () => ({
      artifact: "DIFFERENT",
    }));
    expect(bad).toBe(false);
  });

  it("verifies miss-fill traces and detects tampering attempts", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 3,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const miss = await cache.resolve(buildKey("trace-verify"), async () => ({
      artifact: { nested: true, value: 42 },
    }));

    expect(DeterministicPromptExecutionCache.verifyMissFillTrace(miss.trace)).toBe(true);

    const tampered = {
      ...miss.trace,
      artifactBase64: Buffer.from("tampered").toString("base64"),
    };

    expect(DeterministicPromptExecutionCache.verifyMissFillTrace(tampered)).toBe(false);
  });

  it("records audit logs for hits, misses, and evictions with defensive copies", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 1,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const missA = await cache.resolve(buildKey("audit-a"), async () => ({ artifact: "A" }));
    expect(missA.type).toBe("miss");

    const hitA = await cache.resolve(buildKey("audit-a"), async () => ({ artifact: "A" }));
    expect(hitA.type).toBe("hit");

    const missB = await cache.resolve(buildKey("audit-b"), async () => ({ artifact: "B" }));
    expect(missB.evictionProofs.length).toBe(1);

    const logSnapshot = cache.getAuditLog();
    expect(logSnapshot.misses).toHaveLength(2);
    expect(logSnapshot.hits).toHaveLength(1);
    expect(logSnapshot.evictions).toHaveLength(1);

    // mutate snapshot and ensure internal state remains intact
    logSnapshot.hits[0].key = "mutated-key";
    logSnapshot.evictions[0].survivors[0].accessCounter = -1;

    const secondSnapshot = cache.getAuditLog();
    expect(secondSnapshot.hits[0].key).not.toBe("mutated-key");
    expect(secondSnapshot.evictions[0].survivors[0].accessCounter).toBeGreaterThan(0);
  });
});

describe("Adapters", () => {
  it("wraps OpenAI chat completions with deterministic caching", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 4,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const create = vi.fn(async () => ({
      id: "chatcmpl-1",
      created: 1,
      model: "gpt-test",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "hello" },
          finish_reason: "stop",
        },
      ],
    }));

    const client = {
      chat: {
        completions: {
          create,
        },
      },
    };

    const adapter = createOpenAIChatAdapter({ client, cache });
    const request = {
      model: "gpt-test",
      messages: [
        { role: "system", content: "be terse" },
        { role: "user", content: "hi" },
      ],
      temperature: 0,
      max_tokens: 16,
    };

    const miss = await adapter(request);
    expect(miss.hit).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    const hit = await adapter(request);
    expect(hit.hit).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    const manifest = cache.generateManifest();
    expect(DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
    expect(hit.proof).toBeDefined();
    expect(hit.proof && DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(
      true
    );
  });

  it("wraps Anthropic messages with deterministic caching", async () => {
    let now = 0;
    const cache = new DeterministicPromptExecutionCache({
      maxEntries: 4,
      clock: () => {
        now += 1000;
        return now;
      },
    });

    const create = vi.fn(async () => ({
      id: "msg-1",
      model: "claude-test",
      content: [{ type: "text", text: "hello" }],
    }));

    const client = {
      messages: {
        create,
      },
    };

    const adapter = createAnthropicMessagesAdapter({ client, cache });
    const request = {
      model: "claude-test",
      messages: [{ role: "user", content: "hi there" }],
      max_tokens: 20,
      top_p: 0.9,
    };

    const miss = await adapter(request);
    expect(miss.hit).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);
    const hit = await adapter(request);
    expect(hit.hit).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
    const manifest = cache.generateManifest();
    expect(DeterministicPromptExecutionCache.verifyManifest(manifest)).toBe(true);
    expect(hit.proof).toBeDefined();
    expect(hit.proof && DeterministicPromptExecutionCache.verifyHitProof(hit.proof, manifest)).toBe(
      true
    );
  });
});
