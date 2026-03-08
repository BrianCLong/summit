"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const redact_js_1 = require("../src/redact.js");
(0, vitest_1.describe)("redactSecrets", () => {
    (0, vitest_1.it)("should redact base64 images", () => {
        const input = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==";
        (0, vitest_1.expect)((0, redact_js_1.redactSecrets)(input)).toBe("[REDACTED_IMAGE_BASE64]");
    });
    (0, vitest_1.it)("should redact API keys in objects", () => {
        const input = {
            apiKey: "sk-123456",
            config: {
                moonshot_api_key: "sk-abcdef"
            }
        };
        const output = (0, redact_js_1.redactSecrets)(input);
        (0, vitest_1.expect)(output.apiKey).toBe("[REDACTED]");
        (0, vitest_1.expect)(output.config.moonshot_api_key).toBe("[REDACTED]");
    });
});
