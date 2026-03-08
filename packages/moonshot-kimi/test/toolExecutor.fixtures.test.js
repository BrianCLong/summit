"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const toolExecutor_js_1 = require("../src/toolExecutor.js");
const zod_1 = require("zod");
(0, vitest_1.describe)("ToolExecutor", () => {
    (0, vitest_1.it)("should execute tools and loop", async () => {
        const mockClient = {
            chat: vitest_1.vi.fn()
        };
        mockClient.chat = vitest_1.vi.fn()
            .mockResolvedValueOnce({
            choices: [{
                    finish_reason: "tool_calls",
                    message: {
                        role: "assistant",
                        content: null,
                        tool_calls: [
                            { id: "call_1", type: "function", function: { name: "test_tool", arguments: '{"x": 1}' } }
                        ]
                    }
                }]
        })
            .mockResolvedValueOnce({
            choices: [{
                    finish_reason: "stop",
                    message: { role: "assistant", content: "Done" }
                }]
        });
        const executor = new toolExecutor_js_1.ToolExecutor(mockClient);
        const tools = [{ type: "function", function: { name: "test_tool" } }];
        const toolImpls = {
            test_tool: async (args) => ({ result: args.x + 1 })
        };
        const result = await executor.runLoop([{ role: "user", content: "Run tool" }], tools, toolImpls);
        (0, vitest_1.expect)(result).toHaveLength(4); // User, Assistant(Call), Tool(Result), Assistant(Final)
        (0, vitest_1.expect)(JSON.parse(result[2].content)).toEqual({ result: 2 });
    });
    (0, vitest_1.it)("should fail tool execution if schema validation fails", async () => {
        const mockClient = {
            chat: vitest_1.vi.fn()
        };
        mockClient.chat = vitest_1.vi.fn()
            .mockResolvedValueOnce({
            choices: [{
                    finish_reason: "tool_calls",
                    message: {
                        role: "assistant",
                        content: null,
                        tool_calls: [
                            { id: "call_bad", type: "function", function: { name: "test_tool", arguments: '{"x": "string_instead_of_number"}' } }
                        ]
                    }
                }]
        })
            .mockResolvedValueOnce({
            choices: [{
                    finish_reason: "stop",
                    message: { role: "assistant", content: "Done" }
                }]
        });
        const executor = new toolExecutor_js_1.ToolExecutor(mockClient);
        // Define tool with Zod schema
        const tools = [{
                type: "function",
                function: {
                    name: "test_tool",
                    parameters: {},
                    schema: zod_1.z.object({ x: zod_1.z.number() })
                }
            }];
        const toolImpls = {
            test_tool: async (args) => ({ result: args.x + 1 })
        };
        const result = await executor.runLoop([{ role: "user", content: "Run tool" }], tools, toolImpls);
        // The tool result should contain error
        const toolMsg = result.find(m => m.role === "tool");
        (0, vitest_1.expect)(toolMsg).toBeDefined();
        const content = JSON.parse(toolMsg.content);
        (0, vitest_1.expect)(content.error).toContain("Schema validation failed");
    });
});
