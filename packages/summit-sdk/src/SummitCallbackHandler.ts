import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";
import { AgentAction } from "@langchain/core/agents";
import axios from "axios";

export interface SummitConfig {
    apiUrl: string;
    agentId: string;
    apiKey: string;
    tenantId: string;
}

export class SummitCallbackHandler extends BaseCallbackHandler {
    name = "SummitGovernanceCallbackHandler";
    private config: SummitConfig;

    constructor(config: SummitConfig) {
        super();
        this.config = config;
    }

    async handleToolStart(
        tool: Serialized,
        input: string,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        metadata?: Record<string, unknown>,
        name?: string
    ): Promise<void> {
        try {
            // Step 1: Intercept tool calls for Policy API validation
            const payload = {
                agentId: this.config.agentId,
                tenantId: this.config.tenantId,
                toolName: name || tool.id?.[tool.id.length - 1] || "unknown",
                toolInput: input,
                runId,
                metadata
            };

            const response = await axios.post(
                `${this.config.apiUrl}/api/v4/ai-governance/policy/evaluate`,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${this.config.apiKey}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            // Step 2: Block execution on 403 or allowed: false
            const decision = response.data;
            if (!decision.allowed) {
                throw new Error(`Summit Governance Violation: ${decision.reason || "Tool execution blocked."}`);
            }

            // If allowed, execution proceeds normally.
        } catch (error: any) {
            if (error.response && error.response.status === 403) {
                throw new Error("Summit Governance Violation: Execution blocked due to policy failure (403 Forbidden).");
            }
            // Re-throw if it's already an Error format we threw, otherwise log and throw generic
            if (error instanceof Error && error.message.includes("Summit Governance")) {
                throw error;
            }

            console.error("Summit Governance check failed due to technical error:", error.message);
            // Fail-close principle: block if we can't verify
            throw new Error(`Summit Governance check failed: ${error.message}`);
        }
    }
}
