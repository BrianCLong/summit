"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
(0, vitest_1.describe)("Vision Payload", () => {
    (0, vitest_1.it)("should allow multimodal content array", () => {
        const msg = {
            role: "user",
            content: [
                { type: "text", text: "Look at this" },
                { type: "image_url", image_url: { url: "https://example.com/image.png" } }
            ]
        };
        (0, vitest_1.expect)(msg.content).toHaveLength(2);
    });
});
