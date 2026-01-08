import { describe, expect, it } from "vitest";
import {
  EventLog,
  InMemoryIntentStore,
  PartialWriteDetector,
  TransactionalBoundary,
} from "../src/index.js";

class NoopAdapter {
  async begin() {}
  async commit() {}
  async rollback() {}
}

describe("event log", () => {
  it("builds verifiable hash chain", () => {
    const log = new EventLog();
    log.append({
      id: "1",
      actor: "tester",
      scope: "case",
      timestamp: new Date().toISOString(),
      type: "created",
      payload: { value: 1 },
    });
    log.append({
      id: "2",
      actor: "tester",
      scope: "case",
      timestamp: new Date().toISOString(),
      type: "updated",
      payload: { value: 2 },
    });
    const result = log.verify("case");
    expect(result.valid).toBe(true);
  });

  it("fails verification when tampered", () => {
    const log = new EventLog();
    const event = log.append({
      id: "1",
      actor: "tester",
      scope: "case",
      timestamp: new Date().toISOString(),
      type: "created",
      payload: { value: 1 },
    });
    (event.payload as Record<string, unknown>).value = 999;
    const result = log.verify("case");
    expect(result.valid).toBe(false);
  });
});

describe("transactional boundary", () => {
  it("records and detects partial writes", async () => {
    const adapter = new NoopAdapter();
    const intents = new InMemoryIntentStore();
    const boundary = new TransactionalBoundary(adapter, intents);
    const detector = new PartialWriteDetector(intents);

    await expect(
      boundary.execute({ id: "intent-1", scope: "export", ttlMs: 1000 }, async () => {
        throw new Error("fail");
      })
    ).rejects.toThrowError();

    const pending = await detector.detect(Date.now());
    expect(pending).toHaveLength(1);
  });
});
