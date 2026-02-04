import { describe, it, expect } from "vitest";
import { redactSecrets } from "../src/redact.js";

describe("redactSecrets", () => {
    it("should redact base64 images", () => {
        const input = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
        expect(redactSecrets(input)).toBe("[REDACTED_IMAGE_BASE64]");
    });

    it("should redact API keys in objects", () => {
        const input = {
            apiKey: "sk-123456",
            config: {
                moonshot_api_key: "sk-abcdef"
            }
        };
        const output = redactSecrets(input);
        expect(output.apiKey).toBe("[REDACTED]");
        expect(output.config.moonshot_api_key).toBe("[REDACTED]");
    });
});
