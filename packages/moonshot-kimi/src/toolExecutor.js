"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolExecutor = void 0;
const normalizeToolCallIds_js_1 = require("./normalizeToolCallIds.js");
class ToolExecutor {
    client;
    constructor(client) {
        this.client = client;
    }
    async runLoop(messages, tools, toolImpls, maxTurns = 5) {
        let history = [...messages];
        for (let i = 0; i < maxTurns; i++) {
            const normalizedHistory = (0, normalizeToolCallIds_js_1.normalizeToolCallIdsInHistory)(history);
            // Map definitions to API format (stripping schema field)
            const apiTools = tools.map(t => ({
                type: t.type,
                function: {
                    name: t.function.name,
                    description: t.function.description,
                    parameters: t.function.parameters
                }
            }));
            const req = {
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
                }
                catch (e) {
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
                }
                catch (e) {
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
exports.ToolExecutor = ToolExecutor;
