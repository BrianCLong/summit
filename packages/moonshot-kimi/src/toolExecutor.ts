import { z } from "zod";
import { MoonshotClient } from "./client.js";
import { ChatCompletionRequest, ChatMessage } from "./types.js";
import { normalizeToolCallIdsInHistory } from "./normalizeToolCallIds.js";

// Tool definition with schema
export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters: any; // JSON Schema
        schema?: z.ZodType<any>; // Optional Zod schema for runtime validation
    };
}

export class ToolExecutor {
    constructor(private client: MoonshotClient) {}

    async runLoop(
        messages: ChatMessage[],
        tools: ToolDefinition[],
        toolImpls: Record<string, (args: any) => Promise<any>>,
        maxTurns = 5
    ): Promise<ChatMessage[]> {
        let history = [...messages];

        for (let i = 0; i < maxTurns; i++) {
            const normalizedHistory = normalizeToolCallIdsInHistory(history);

            // Map definitions to API format (stripping schema field)
            const apiTools = tools.map(t => ({
                type: t.type,
                function: {
                    name: t.function.name,
                    description: t.function.description,
                    parameters: t.function.parameters
                }
            }));

            const req: ChatCompletionRequest = {
                model: "moonshot-v1-8k",
                messages: normalizedHistory,
                tools: apiTools,
                temperature: 0.3
            };

            const response = await this.client.chat(req);
            const choice = response.choices[0];
            const msg = choice.message;

            history.push(msg);

            if (choice.finish_reason !== "tool_calls" || !msg.tool_calls) {
                return history;
            }

            for (const tc of msg.tool_calls) {
                const toolDef = tools.find(t => t.function.name === tc.function.name);
                const fn = toolImpls[tc.function.name];

                if (!fn || !toolDef) {
                     history.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: JSON.stringify({ error: "Tool not found" })
                    });
                    continue;
                }

                let args;
                try {
                    args = JSON.parse(tc.function.arguments);
                } catch (e) {
                     history.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: JSON.stringify({ error: "Invalid JSON arguments" })
                    });
                    continue;
                }

                // Zod Validation
                if (toolDef.function.schema) {
                    const result = toolDef.function.schema.safeParse(args);
                    if (!result.success) {
                        history.push({
                            role: "tool",
                            tool_call_id: tc.id,
                            name: tc.function.name,
                            content: JSON.stringify({ error: "Schema validation failed", details: result.error.errors })
                        });
                        continue;
                    }
                    args = result.data;
                }

                try {
                    const result = await fn(args);
                    history.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: JSON.stringify(result)
                    });
                } catch (e: any) {
                     history.push({
                        role: "tool",
                        tool_call_id: tc.id,
                        name: tc.function.name,
                        content: JSON.stringify({ error: e.message })
                    });
                }
            }
        }
        return history;
    }
}
