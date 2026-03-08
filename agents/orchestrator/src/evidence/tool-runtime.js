"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolRuntime = void 0;
const contracts_js_1 = require("./contracts.js");
class ToolRuntime {
    registry;
    handlers = new Map();
    config;
    constructor(registry, config = {}) {
        this.registry = registry;
        this.config = config;
    }
    registerHandler(toolName, handler) {
        this.handlers.set(toolName, handler);
    }
    async runTool(toolName, args, context) {
        const contract = this.registry.get(toolName);
        if (!contract) {
            return { toolName, success: false, error: `No contract for tool ${toolName}` };
        }
        const handler = this.handlers.get(toolName);
        if (!handler) {
            return { toolName, success: false, error: `No handler for tool ${toolName}` };
        }
        const parsedArgs = contract.argsSchema.safeParse(args);
        if (!parsedArgs.success) {
            await context.recorder?.record({
                type: 'tool:validation_failed',
                timestamp: new Date().toISOString(),
                run_id: context.runId,
                plan_id: context.planId,
                step_id: context.stepId,
                tool_name: toolName,
                data: {
                    stage: 'args',
                    issues: parsedArgs.error.issues.map((issue) => issue.message),
                    args: (0, contracts_js_1.applyRedactionRules)(args, contract.redactionRules),
                },
            });
            return {
                toolName,
                success: false,
                error: `Argument validation failed for ${toolName}`,
            };
        }
        await context.recorder?.record({
            type: 'tool:started',
            timestamp: new Date().toISOString(),
            run_id: context.runId,
            plan_id: context.planId,
            step_id: context.stepId,
            tool_name: toolName,
            data: { args: (0, contracts_js_1.applyRedactionRules)(parsedArgs.data, contract.redactionRules) },
        });
        try {
            const output = (await handler(parsedArgs.data));
            const parsedOutput = contract.outputSchema.safeParse(output);
            if (!parsedOutput.success) {
                await context.recorder?.record({
                    type: 'tool:validation_failed',
                    timestamp: new Date().toISOString(),
                    run_id: context.runId,
                    plan_id: context.planId,
                    step_id: context.stepId,
                    tool_name: toolName,
                    data: {
                        stage: 'output',
                        issues: parsedOutput.error.issues.map((issue) => issue.message),
                        output: (0, contracts_js_1.applyRedactionRules)(output, contract.redactionRules),
                    },
                });
                return {
                    toolName,
                    success: false,
                    error: `Output validation failed for ${toolName}`,
                };
            }
            let postconditionIssues;
            if (contract.postcondition) {
                const post = contract.postcondition(parsedOutput.data);
                if (!post.ok) {
                    postconditionIssues = post.issues ?? ['Postcondition failed'];
                    await context.recorder?.record({
                        type: 'tool:postcondition_failed',
                        timestamp: new Date().toISOString(),
                        run_id: context.runId,
                        plan_id: context.planId,
                        step_id: context.stepId,
                        tool_name: toolName,
                        data: {
                            issues: postconditionIssues,
                            output: (0, contracts_js_1.applyRedactionRules)(parsedOutput.data, contract.redactionRules),
                        },
                    });
                    if (this.config.strictPostconditions) {
                        return {
                            toolName,
                            success: false,
                            error: `Postcondition failed for ${toolName}`,
                            postconditionIssues,
                        };
                    }
                }
            }
            await context.recorder?.record({
                type: 'tool:completed',
                timestamp: new Date().toISOString(),
                run_id: context.runId,
                plan_id: context.planId,
                step_id: context.stepId,
                tool_name: toolName,
                data: {
                    output: (0, contracts_js_1.applyRedactionRules)(parsedOutput.data, contract.redactionRules),
                    postconditionIssues,
                },
            });
            return { toolName, success: true, output: parsedOutput.data, postconditionIssues };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Tool execution failed';
            await context.recorder?.record({
                type: 'tool:failed',
                timestamp: new Date().toISOString(),
                run_id: context.runId,
                plan_id: context.planId,
                step_id: context.stepId,
                tool_name: toolName,
                data: { error: message },
            });
            return { toolName, success: false, error: message };
        }
    }
}
exports.ToolRuntime = ToolRuntime;
