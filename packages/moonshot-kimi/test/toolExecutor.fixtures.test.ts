import { describe, it, expect, vi } from "vitest";
import { ToolExecutor } from "../src/toolExecutor.js";
import { MoonshotClient } from "../src/client.js";
import { z } from "zod";

describe("ToolExecutor", () => {
    it("should execute tools and loop", async () => {
        const mockClient = {
            chat: vi.fn()
        } as unknown as MoonshotClient;

        mockClient.chat = vi.fn()
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

        const executor = new ToolExecutor(mockClient);
        const tools = [{ type: "function", function: { name: "test_tool" } }];
        const toolImpls = {
            test_tool: async (args: any) => ({ result: args.x + 1 })
        };

        const result = await executor.runLoop([{ role: "user", content: "Run tool" }], tools as any, toolImpls);

        expect(result).toHaveLength(4); // User, Assistant(Call), Tool(Result), Assistant(Final)
        expect(JSON.parse(result[2].content as string)).toEqual({ result: 2 });
    });

    it("should fail tool execution if schema validation fails", async () => {
        const mockClient = {
            chat: vi.fn()
        } as unknown as MoonshotClient;

        mockClient.chat = vi.fn()
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

        const executor = new ToolExecutor(mockClient);

        // Define tool with Zod schema
        const tools = [{
            type: "function",
            function: {
                name: "test_tool",
                parameters: {},
                schema: z.object({ x: z.number() })
            }
        }];

        const toolImpls = {
            test_tool: async (args: any) => ({ result: args.x + 1 })
        };

        const result = await executor.runLoop([{ role: "user", content: "Run tool" }], tools as any, toolImpls);

        // The tool result should contain error
        const toolMsg = result.find(m => m.role === "tool");
        expect(toolMsg).toBeDefined();
        const content = JSON.parse(toolMsg!.content as string);
        expect(content.error).toContain("Schema validation failed");
    });
});
