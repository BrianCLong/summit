import { describe, it, expect } from "vitest";
import { normalizeToolCallIdsInHistory } from "../src/normalizeToolCallIds.js";
import { ChatMessage } from "../src/types.js";

describe("normalizeToolCallIdsInHistory", () => {
    it("should normalize tool call IDs to functions.name:idx format", () => {
        const history: ChatMessage[] = [
            {
                role: "assistant",
                content: null,
                tool_calls: [
                    { id: "call_123", type: "function", function: { name: "get_weather", arguments: "{}" } },
                    { id: "call_456", type: "function", function: { name: "get_time", arguments: "{}" } }
                ]
            }
        ];

        const normalized = normalizeToolCallIdsInHistory(history);
        expect(normalized[0].tool_calls![0].id).toBe("functions.get_weather:0");
        expect(normalized[0].tool_calls![1].id).toBe("functions.get_time:1");
    });

    it("should handle mixed messages", () => {
         const history: ChatMessage[] = [
            { role: "user", content: "Hi" },
            {
                role: "assistant",
                content: null,
                tool_calls: [
                    { id: "call_1", type: "function", function: { name: "foo", arguments: "{}" } }
                ]
            }
        ];
        const normalized = normalizeToolCallIdsInHistory(history);
        expect(normalized[0]).toBe(history[0]); // User message untouched
        expect(normalized[1].tool_calls![0].id).toBe("functions.foo:0");
    });

    it("should update tool_call_id in tool messages", () => {
        const history: ChatMessage[] = [
            {
                role: "assistant",
                content: null,
                tool_calls: [
                    { id: "call_abc", type: "function", function: { name: "test", arguments: "{}" } }
                ]
            },
            {
                role: "tool",
                tool_call_id: "call_abc",
                name: "test",
                content: "result"
            }
        ];

        const normalized = normalizeToolCallIdsInHistory(history);
        expect(normalized[0].tool_calls![0].id).toBe("functions.test:0");
        expect(normalized[1].tool_call_id).toBe("functions.test:0");
    });
});
