import { describe, it, expect, beforeAll } from "vitest";
import { DepotService } from "../src/secrets/depot-service";
import { AuditBus } from "../src/audit/bus";
import { rm } from "fs/promises";

const TEST_LOG_DIR = "./logs/test-secrets";

describe("DepotService (Secrets Management)", () => {
  beforeAll(async () => {
    process.env.AUDIT_LOG_DIR = TEST_LOG_DIR;
    await rm(TEST_LOG_DIR, { recursive: true, force: true });
  });

  it("should issue and retrieve a secret", async () => {
    const service = DepotService.getInstance();
    await service.issueSecret("tenant-1", "api-key", "secret-value");

    const secret = await service.getSecret("tenant-1", "api-key");
    expect(secret).toBeDefined();
    expect(secret?.value).toBe("secret-value");
    expect(secret?.version).toBe(1);
  });

  it("should rotate a secret", async () => {
    const service = DepotService.getInstance();
    await service.rotateSecret("tenant-1", "api-key", "new-secret-value");

    const secret = await service.getSecret("tenant-1", "api-key");
    expect(secret?.value).toBe("new-secret-value");
    expect(secret?.version).toBe(2);
  });

  it("should audit secret access", async () => {
    const bus = AuditBus.getInstance();
    const events = await bus.query("tenant-1", { type: "secret.accessed" });
    expect(events.length).toBeGreaterThan(0);
  });
});
