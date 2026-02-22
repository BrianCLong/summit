import { describe, it, expect } from "vitest";
import { ChatMessage } from "../src/types.js";

describe("Vision Payload", () => {
    it("should allow multimodal content array", () => {
        const msg: ChatMessage = {
            role: "user",
            content: [
                { type: "text", text: "Look at this" },
                { type: "image_url", image_url: { url: "https://example.com/image.png" } }
            ]
        };
        expect(msg.content).toHaveLength(2);
    });
});
