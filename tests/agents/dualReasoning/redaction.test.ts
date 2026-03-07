import { describe, it, expect } from "vitest";
import { redact, containsCanary } from "../../../src/agents/dualReasoning/redaction";

describe("Redaction Logic", () => {
  it("should redact sensitive fields", () => {
    const input = {
      instruction: "SECRET_INSTRUCTION",
      public: "VISIBLE",
      nested: {
        output: "SECRET_OUTPUT",
        rationale: ["REASON1", "REASON2"],
        other: 123
      }
    };

    const result = redact(input);

    expect(result.instruction).toBe("[REDACTED]");
    expect(result.public).toBe("VISIBLE");
    expect(result.nested.output).toBe("[REDACTED]");
    expect(result.nested.rationale).toBe("[REDACTED]");
    expect(result.nested.other).toBe(123);
  });

  it("should handle arrays", () => {
    const input = [
      { instruction: "A" },
      { output: "B" }
    ];

    const result = redact(input);
    expect(result[0].instruction).toBe("[REDACTED]");
    expect(result[1].output).toBe("[REDACTED]");
  });

  it("should detect canary strings", () => {
    const text = "This is a secret: CANARY_12345";
    expect(containsCanary(text, "CANARY_12345")).toBe(true);
    expect(containsCanary(text, "OTHER")).toBe(false);
  });
});
