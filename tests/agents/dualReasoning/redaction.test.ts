import { redact, enforceHardSecurity } from "../../../src/agents/dualReasoning/redaction";

describe("DualReasoning Redaction", () => {
  it("should redact sensitive keys by default", () => {
    const data = {
      instruction: "Do something bad",
      output: "Sensitive output",
      meta: "Safe meta"
    };
    const redacted = redact(data);
    expect(redacted.instruction).toBe("[REDACTED]");
    expect(redacted.output).toBe("[REDACTED]");
    expect(redacted.meta).toBe("Safe meta");
  });

  it("should redact canary strings in text", () => {
    const canary = "SECRET_CANARY_123";
    const text = `The secret is ${canary}. Don't tell anyone.`;
    const redacted = redact(text, { canaryStrings: [canary] });
    expect(redacted).not.toContain(canary);
    expect(redacted).toContain("[REDACTED]");
  });

  it("should redact recursively and handle arrays", () => {
    const data = {
      nested: {
        steps: ["Kill process", "Delete files"],
        other: "Safe"
      }
    };
    const redacted = redact(data);
    expect(redacted.nested.steps).toEqual(["[REDACTED]"]);
    expect(redacted.nested.other).toBe("Safe");
  });

  it("should enforce hard security for secrets even in raw mode", () => {
    const canary = "API_KEY_XYZZY";
    const content = `Connecting with ${canary}`;
    const result = enforceHardSecurity(content, [canary]);
    expect(result).toBe("Connecting with [SECRET_REDACTED]");
  });
});
