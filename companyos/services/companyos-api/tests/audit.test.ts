import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AuditBus } from "../src/audit/bus";
import { verifyEvent } from "../src/audit/signer";
import { rm } from "fs/promises";
import path from "path";

const TEST_LOG_DIR = "./logs/test-audit";

describe("AuditBus", () => {
  beforeAll(async () => {
    process.env.AUDIT_LOG_DIR = TEST_LOG_DIR;
  });

  afterAll(async () => {
    await rm(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("should publish a signed event", async () => {
    const bus = AuditBus.getInstance();
    const event = await bus.publish({
      tenant_id: "test-tenant",
      type: "test.event",
      actor: { id: "user-1", type: "human" },
      action: "create",
      resource: { type: "document", id: "doc-1" },
      payload: { foo: "bar" },
    });

    expect(event.id).toBeDefined();
    expect(event.signature).toBeDefined();
    expect(verifyEvent(event)).toBe(true);
  });

  it("should query events by tenant", async () => {
    const bus = AuditBus.getInstance();
    const events = await bus.query("test-tenant");
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].tenant_id).toBe("test-tenant");
  });

  it("should return empty array for non-existent tenant", async () => {
    const bus = AuditBus.getInstance();
    const events = await bus.query("non-existent");
    expect(events).toEqual([]);
  });
});
