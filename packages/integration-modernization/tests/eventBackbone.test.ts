import { createHmac } from "crypto";
import { EventBackbone } from "../src/eventBackbone";
import { SchemaDefinition } from "../src/types";
import { SecurityControls } from "../src/security";

describe("EventBackbone", () => {
  const options = {
    maxAttempts: 2,
    baseBackoffMs: 1,
    quotaPerTenant: 2,
    signatureSecret: "secret",
  };
  let backbone: EventBackbone;
  let consumer: jest.MockedFunction<(event: any) => Promise<boolean>>;

  beforeEach(() => {
    backbone = new EventBackbone(options);
    consumer = jest.fn(async (event) => {
      return event.attempts > 1;
    });
    const schema: SchemaDefinition = {
      name: "user.created",
      version: "1.0.0",
      requiredFields: ["id", "email"],
    };
    backbone.registerSchema(schema);
  });

  it("deduplicates events and sends to DLQ after retries", async () => {
    const payload = { id: "1", email: "a@example.com" };
    const status = await backbone.publish("tenantA", "user.created", payload, "abc", consumer);
    expect(status).toBe("delivered");

    const duplicate = await backbone.publish("tenantA", "user.created", payload, "abc", consumer);
    expect(duplicate).toBe("delivered");

    const failingConsumer = jest.fn(async () => false);
    const status2 = await backbone.publish(
      "tenantA",
      "user.created",
      payload,
      "def",
      failingConsumer
    );
    expect(status2).toBe("dead-lettered");
    expect(backbone.deadLetterQueue().length).toBe(1);
  });

  it("enforces tenant quotas", async () => {
    const payload = { id: "2", email: "b@example.com" };
    await backbone.publish("tenantB", "user.created", payload, "one", consumer);
    await backbone.publish("tenantB", "user.created", payload, "two", consumer);
    await expect(
      backbone.publish("tenantB", "user.created", payload, "three", consumer)
    ).rejects.toThrow("Tenant quota exceeded");
  });
});

describe("SecurityControls", () => {
  it("verifies signatures, egress, approvals, and rate limits", () => {
    const controls = new SecurityControls({ allowedHosts: ["api.example.com"] }, [
      { tenantId: "t1", limit: 1, windowMs: 1000 },
    ]);
    const payload = JSON.stringify({ foo: "bar" });
    const signature = createHmac("sha256", "secret").update(payload).digest("hex");
    expect(controls.verifyWebhookSignature(payload, signature, "secret")).toBe(true);

    expect(() => controls.assertEgress("https://api.example.com/path")).not.toThrow();
    expect(() => controls.assertEgress("https://evil.test/path")).toThrow(
      "Egress host evil.test not allowed"
    );

    expect(() => controls.requireApproval("c1")).toThrow(
      "Connector c1 requires two-person approval"
    );
    controls.approve("c1");
    expect(() => controls.requireApproval("c1")).not.toThrow();

    controls.enableKillSwitch("c2");
    expect(controls.isDisabled("c2")).toBe(true);

    controls.enforceRateLimit("t1");
    expect(() => controls.enforceRateLimit("t1")).toThrow("Rate limit exceeded");
  });
});
